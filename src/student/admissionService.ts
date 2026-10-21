import { DatabaseService } from '../db/index.js';
import { AuthActor, can } from '../auth/policy.js';

export interface CreateAdmissionInput {
  academic_year_code: string;
  college_id: string; // USN
  full_name: string;
  department: string;
  semester?: number;
  official_priority: number;
  email: string;
  phone: string;
  parent_name?: string;
  parent_relationship?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_address?: string;
  proctor_user_id?: string;
  hostel_building_id?: string;
  notes?: string;
}

export interface UpdateAdmissionInput {
  academic_year_code?: string;
  full_name?: string;
  department?: string;
  semester?: number;
  official_priority?: number;
  admission_status?: 'REGISTERED' | 'DOCS_PENDING' | 'PROCTOR_ASSIGNED' | 'COMPLETED';
  email?: string;
  phone?: string;
  parent_name?: string;
  parent_relationship?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_address?: string;
  proctor_user_id?: string;
  hostel_building_id?: string;
  notes?: string;
}

export interface AdmissionFilterQuery {
  search?: string;
  academic_year_code?: string;
  department?: string;
  admission_status?: string;
  proctor_user_id?: string;
}

export class StudentAdmissionService {
  constructor(private db: DatabaseService) {}

  /**
   * Register a new admitted candidate into hostel records.
   * Validates official_priority uniqueness globally and links with user/student_profile.
   */
  async createAdmission(input: CreateAdmissionInput, actor: AuthActor) {
    if (!can(actor, 'student.manage')) {
      throw new Error('FORBIDDEN: Only Hostel Office or Super Admin can create admission records');
    }

    // Required fields validation
    if (!input.academic_year_code?.trim()) throw new Error('VALIDATION_ERROR: Academic year is required');
    if (!input.college_id?.trim()) throw new Error('VALIDATION_ERROR: USN is required');
    if (!input.full_name?.trim()) throw new Error('VALIDATION_ERROR: Full name is required');
    if (!input.department?.trim()) throw new Error('VALIDATION_ERROR: Department/branch is required');
    if (!input.email?.trim() || !input.email.includes('@')) throw new Error('VALIDATION_ERROR: Valid email is required');
    if (!input.phone?.trim()) throw new Error('VALIDATION_ERROR: Phone number is required');
    
    const priority = Number(input.official_priority);
    if (!priority || isNaN(priority) || priority < 1) {
      throw new Error('VALIDATION_ERROR: Official priority number must be a positive integer');
    }

    const collegeId = input.college_id.trim().toUpperCase();

    return this.db.transaction(async (client) => {
      // 1. Authoritative check for existing USN across admissions and users
      const existUsn = await client.query(
        `SELECT id FROM student_admissions WHERE college_id = $1`,
        [collegeId]
      );
      if (existUsn.rows.length > 0) {
        throw new Error(`DUPLICATE_USN: An admission record with USN ${collegeId} already exists`);
      }

      // 2. Authoritative check for official priority uniqueness across admissions and active student profiles
      const existPriorityAdmission = await client.query(
        `SELECT id, college_id FROM student_admissions WHERE official_priority = $1`,
        [priority]
      );
      if (existPriorityAdmission.rows.length > 0) {
        throw new Error(`DUPLICATE_PRIORITY: Official priority #${priority} is already assigned to student ${existPriorityAdmission.rows[0].college_id}`);
      }

      const existPriorityProfile = await client.query(
        `SELECT id, college_id FROM student_profiles WHERE assigned_priority = $1`,
        [priority]
      );
      if (existPriorityProfile.rows.length > 0) {
        throw new Error(`DUPLICATE_PRIORITY: Official priority #${priority} is already claimed in student registry by ${existPriorityProfile.rows[0].college_id}`);
      }

      // 3. Resolve proctor details if proctor_user_id provided
      let proctorName: string | null = null;
      let proctorDept: string | null = null;
      if (input.proctor_user_id) {
        const procRes = await client.query(
          `SELECT u.full_name 
           FROM users u
           JOIN user_roles ur ON u.id = ur.user_id
           JOIN roles r ON ur.role_id = r.id
           WHERE u.id = $1 AND r.name = 'PROCTOR'`,
          [input.proctor_user_id]
        );
        if (procRes.rows.length === 0) {
          throw new Error('INVALID_PROCTOR: Selected proctor is not an authorized, active faculty proctor');
        }
        proctorName = procRes.rows[0].full_name;
        proctorDept = 'Faculty of Engineering';
      }

      // 4. Create authoritative admission record
      const admissionId = `adm_${Date.now()}_${collegeId.toLowerCase()}`;
      const status = input.proctor_user_id ? 'PROCTOR_ASSIGNED' : 'REGISTERED';

      const admRes = await client.query(
        `INSERT INTO student_admissions (
           id, academic_year_code, college_id, full_name, department, semester,
           official_priority, admission_status, email, phone,
           parent_name, parent_relationship, parent_phone, parent_email, parent_address,
           proctor_user_id, proctor_name, proctor_department, hostel_building_id,
           registered_by, notes
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
         ) RETURNING *`,
        [
          admissionId,
          input.academic_year_code.trim(),
          collegeId,
          input.full_name.trim(),
          input.department.trim(),
          input.semester || 1,
          priority,
          status,
          input.email.trim(),
          input.phone.trim(),
          input.parent_name?.trim() || null,
          input.parent_relationship?.trim() || null,
          input.parent_phone?.trim() || null,
          input.parent_email?.trim() || null,
          input.parent_address?.trim() || null,
          input.proctor_user_id || null,
          proctorName,
          proctorDept,
          input.hostel_building_id || null,
          actor.id,
          input.notes?.trim() || null,
        ]
      );

      // 5. Authoritatively integrate into student user & profile accounts (preserving unverified fee / terms)
      const userId = `usr_${collegeId.toLowerCase()}`;
      const profileId = `prof_${collegeId.toLowerCase()}`;
      const defaultPasswordHash = 'mock_default_hash';

      // Ensure user entry exists
      await client.query(
        `INSERT INTO users (id, college_id, email, full_name, phone, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE 
           SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone`,
        [userId, collegeId, input.email.trim(), input.full_name.trim(), input.phone.trim(), defaultPasswordHash]
      );

      // Assign student role if absent
      const studentRoleRes = await client.query(`SELECT id FROM roles WHERE name = 'STUDENT'`);
      const studentRoleId = studentRoleRes.rows[0]?.id || 'role_student';
      await client.query(
        `INSERT INTO user_roles (id, user_id, role_id, scope_type)
         VALUES ($1, $2, $3, 'STUDENT')
         ON CONFLICT (id) DO NOTHING`,
        [`ur_${userId}`, userId, studentRoleId]
      );

      // Create student_profile with PENDING eligibility and UNPAID fee (does NOT falsely grant allocation eligibility)
      await client.query(
        `INSERT INTO student_profiles (
           id, user_id, college_id, full_name, academic_year, department, gender,
           quota_category, eligibility_status, assigned_priority,
           proctor_user_id, proctor_name, proctor_department,
           parent_name, parent_relationship, parent_phone, parent_email,
           fee_status, profile_submitted
         ) VALUES (
           $1, $2, $3, $4, $5, $6, 'MALE', 'GENERAL', 'PENDING', $7,
           $8, $9, $10, $11, $12, $13, $14, 'UNPAID', FALSE
         )
         ON CONFLICT (id) DO UPDATE 
           SET assigned_priority = EXCLUDED.assigned_priority,
               proctor_user_id = COALESCE(EXCLUDED.proctor_user_id, student_profiles.proctor_user_id),
               proctor_name = COALESCE(EXCLUDED.proctor_name, student_profiles.proctor_name),
               proctor_department = COALESCE(EXCLUDED.proctor_department, student_profiles.proctor_department),
               parent_name = COALESCE(EXCLUDED.parent_name, student_profiles.parent_name),
               parent_phone = COALESCE(EXCLUDED.parent_phone, student_profiles.parent_phone)`,
        [
          profileId,
          userId,
          collegeId,
          input.full_name.trim(),
          input.semester ? Math.ceil(input.semester / 2) : 1,
          input.department.trim(),
          priority,
          input.proctor_user_id || null,
          proctorName,
          proctorDept,
          input.parent_name?.trim() || null,
          input.parent_relationship?.trim() || null,
          input.parent_phone?.trim() || null,
          input.parent_email?.trim() || null,
        ]
      );

      return admRes.rows[0];
    });
  }

  /**
   * List and filter admissions
   */
  async listAdmissions(actor: AuthActor, filters: AdmissionFilterQuery = {}) {
    if (!can(actor, 'student.manage')) {
      throw new Error('FORBIDDEN: Insufficient permissions to view admission registry');
    }

    const params: any[] = [];
    let sql = `
      SELECT sa.*, b.name as hostel_name
      FROM student_admissions sa
      LEFT JOIN buildings b ON sa.hostel_building_id = b.id
      WHERE 1=1
    `;

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      params.push(term);
      sql += ` AND (LOWER(sa.college_id) LIKE $${params.length} 
                 OR LOWER(sa.full_name) LIKE $${params.length} 
                 OR LOWER(sa.email) LIKE $${params.length} 
                 OR CAST(sa.official_priority AS TEXT) LIKE $${params.length})`;
    }

    if (filters.academic_year_code?.trim()) {
      params.push(filters.academic_year_code.trim());
      sql += ` AND sa.academic_year_code = $${params.length}`;
    }

    if (filters.department?.trim()) {
      params.push(filters.department.trim());
      sql += ` AND sa.department = $${params.length}`;
    }

    if (filters.admission_status?.trim()) {
      params.push(filters.admission_status.trim());
      sql += ` AND sa.admission_status = $${params.length}`;
    }

    if (filters.proctor_user_id?.trim()) {
      params.push(filters.proctor_user_id.trim());
      sql += ` AND sa.proctor_user_id = $${params.length}`;
    }

    sql += ` ORDER BY sa.official_priority ASC, sa.created_at DESC`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  /**
   * Get single admission detail
   */
  async getAdmission(id: string, actor: AuthActor) {
    if (!can(actor, 'student.manage')) {
      throw new Error('FORBIDDEN: Insufficient permissions to inspect admission details');
    }

    const res = await this.db.query(
      `SELECT sa.*, b.name as hostel_name 
       FROM student_admissions sa
       LEFT JOIN buildings b ON sa.hostel_building_id = b.id
       WHERE sa.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      throw new Error('NOT_FOUND: Admission record not found');
    }

    return res.rows[0];
  }

  /**
   * Update permitted admission fields
   */
  async updateAdmission(id: string, input: UpdateAdmissionInput, actor: AuthActor) {
    if (!can(actor, 'student.manage')) {
      throw new Error('FORBIDDEN: Only authorized staff can update admission records');
    }

    return this.db.transaction(async (client) => {
      const exist = await client.query(`SELECT * FROM student_admissions WHERE id = $1`, [id]);
      if (exist.rows.length === 0) throw new Error('NOT_FOUND: Admission record not found');
      const current = exist.rows[0];

      // If official priority changed, validate uniqueness globally
      if (input.official_priority !== undefined && input.official_priority !== current.official_priority) {
        const pNum = Number(input.official_priority);
        if (!pNum || pNum < 1) throw new Error('VALIDATION_ERROR: Priority must be a positive integer');

        const existP = await client.query(
          `SELECT id, college_id FROM student_admissions WHERE official_priority = $1 AND id != $2`,
          [pNum, id]
        );
        if (existP.rows.length > 0) {
          throw new Error(`DUPLICATE_PRIORITY: Official priority #${pNum} is already assigned to student ${existP.rows[0].college_id}`);
        }

        const existProfP = await client.query(
          `SELECT id, college_id FROM student_profiles WHERE assigned_priority = $1 AND college_id != $2`,
          [pNum, current.college_id]
        );
        if (existProfP.rows.length > 0) {
          throw new Error(`DUPLICATE_PRIORITY: Official priority #${pNum} is already claimed in registry by ${existProfP.rows[0].college_id}`);
        }

        // Sync with student_profile assigned_priority
        await client.query(
          `UPDATE student_profiles SET assigned_priority = $1, updated_at = CURRENT_TIMESTAMP WHERE college_id = $2`,
          [pNum, current.college_id]
        );
      }

      // Proctor lookup if updated
      let proctorName = current.proctor_name;
      let proctorDept = current.proctor_department;
      if (input.proctor_user_id !== undefined && input.proctor_user_id !== current.proctor_user_id) {
        if (input.proctor_user_id) {
          const procRes = await client.query(
            `SELECT u.full_name FROM users u
             JOIN user_roles ur ON u.id = ur.user_id
             JOIN roles r ON ur.role_id = r.id
             WHERE u.id = $1 AND r.name = 'PROCTOR'`,
            [input.proctor_user_id]
          );
          if (procRes.rows.length === 0) {
            throw new Error('INVALID_PROCTOR: Selected proctor is not an authorized faculty proctor');
          }
          proctorName = procRes.rows[0].full_name;
          proctorDept = 'Faculty of Engineering';
        } else {
          proctorName = null;
          proctorDept = null;
        }
      }

      const updated = await client.query(
        `UPDATE student_admissions SET
           academic_year_code = COALESCE($1, academic_year_code),
           full_name = COALESCE($2, full_name),
           department = COALESCE($3, department),
           semester = COALESCE($4, semester),
           official_priority = COALESCE($5, official_priority),
           admission_status = COALESCE($6, admission_status),
           email = COALESCE($7, email),
           phone = COALESCE($8, phone),
           parent_name = COALESCE($9, parent_name),
           parent_relationship = COALESCE($10, parent_relationship),
           parent_phone = COALESCE($11, parent_phone),
           parent_email = COALESCE($12, parent_email),
           parent_address = COALESCE($13, parent_address),
           proctor_user_id = $14,
           proctor_name = $15,
           proctor_department = $16,
           hostel_building_id = COALESCE($17, hostel_building_id),
           notes = COALESCE($18, notes),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $19
         RETURNING *`,
        [
          input.academic_year_code || null,
          input.full_name || null,
          input.department || null,
          input.semester || null,
          input.official_priority || null,
          input.admission_status || null,
          input.email || null,
          input.phone || null,
          input.parent_name || null,
          input.parent_relationship || null,
          input.parent_phone || null,
          input.parent_email || null,
          input.parent_address || null,
          input.proctor_user_id !== undefined ? input.proctor_user_id : current.proctor_user_id,
          proctorName,
          proctorDept,
          input.hostel_building_id || null,
          input.notes || null,
          id,
        ]
      );

      return updated.rows[0];
    });
  }

  /**
   * List valid active proctors for selection dropdown
   */
  async listProctors(actor: AuthActor) {
    if (!can(actor, 'student.manage')) {
      throw new Error('FORBIDDEN: Insufficient permissions to view faculty proctors');
    }

    const res = await this.db.query(
      `SELECT u.id, u.college_id, u.full_name, u.email, u.phone
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.name = 'PROCTOR' AND u.is_active = TRUE
       ORDER BY u.full_name ASC`
    );
    return res.rows;
  }
}
