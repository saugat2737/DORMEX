import { DatabaseService } from '../db/index.js';
import { AuthActor, can } from '../auth/policy.js';

export interface RegisterStudentInput {
  college_id: string;
  email: string;
  full_name: string;
  phone?: string;
  academic_year: number;
  department: string;
  gender: 'MALE' | 'FEMALE';
  quota_category: 'GENERAL' | 'MERIT' | 'SPORTS' | 'PWD' | 'NRI';
  eligibility_status: 'PENDING' | 'ELIGIBLE' | 'INELIGIBLE' | 'FEE_PENDING';
  proctor_user_id?: string;
}

export class StudentRegistryService {
  constructor(private db: DatabaseService) {}

  async registerStudent(input: RegisterStudentInput, actor: AuthActor): Promise<{ userId: string; profileId: string }> {
    if (!can(actor, 'student.manage')) {
      throw new Error('FORBIDDEN: Only Hostel Office or Super Admin can register students');
    }

    return this.db.transaction(async (client) => {
      const userId = `usr_${input.college_id.toLowerCase()}`;
      const profileId = `prof_${input.college_id.toLowerCase()}`;
      const defaultPasswordHash = 'mock_default_hash';

      await client.query(
        `INSERT INTO users (id, college_id, email, full_name, phone, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, input.college_id, input.email, input.full_name, input.phone || null, defaultPasswordHash]
      );

      // Assign STUDENT role
      const roleRes = await client.query(`SELECT id FROM roles WHERE name = 'STUDENT'`);
      const roleId = roleRes.rows[0]?.id || 'role_student';

      await client.query(
        `INSERT INTO user_roles (id, user_id, role_id, scope_type, scope_id)
         VALUES ($1, $2, $3, 'STUDENT', NULL)`,
        [`ur_${userId}`, userId, roleId]
      );

      // Create authoritative student profile
      await client.query(
        `INSERT INTO student_profiles (
          id, user_id, college_id, full_name, academic_year, department, gender, quota_category, eligibility_status, proctor_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          profileId,
          userId,
          input.college_id,
          input.full_name,
          input.academic_year,
          input.department,
          input.gender,
          input.quota_category,
          input.eligibility_status,
          input.proctor_user_id || null,
        ]
      );

      return { userId, profileId };
    });
  }

  async updateEligibility(
    studentProfileId: string,
    eligibilityStatus: 'PENDING' | 'ELIGIBLE' | 'INELIGIBLE' | 'FEE_PENDING',
    actor: AuthActor
  ): Promise<void> {
    if (!can(actor, 'student.manage')) {
      throw new Error('FORBIDDEN: Only authorized staff can update student eligibility');
    }

    await this.db.query(
      `UPDATE student_profiles SET eligibility_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [eligibilityStatus, studentProfileId]
    );
  }

  async updatePriority(
    studentProfileId: string,
    priority: number,
    actor: AuthActor
  ): Promise<void> {
    if (!can(actor, 'student.edit_priority')) {
      throw new Error('FORBIDDEN: Only authorized staff (Hostel Office or Super Admin) can assign student priority');
    }

    await this.db.query(
      `UPDATE student_profiles SET assigned_priority = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [priority, studentProfileId]
    );

    // Also update active waiting room entry priority if present
    await this.db.query(
      `UPDATE waiting_room_entries SET priority_number = $1 WHERE student_id = $2 AND status = 'WAITING'`,
      [priority, studentProfileId]
    );
  }

  async updateStudentProfile(
    studentProfileId: string,
    data: {
      phone?: string;
      parent_name?: string;
      parent_relationship?: string;
      parent_phone?: string;
      parent_email?: string;
      local_guardian_name?: string;
      local_guardian_relationship?: string;
      local_guardian_phone?: string;
      local_guardian_email?: string;
      local_guardian_address?: string;
      proctor_name?: string;
      proctor_department?: string;
      fee_receipt_ref?: string;
    },
    actor: AuthActor
  ): Promise<void> {
    if (actor.role === 'STUDENT' && actor.student_profile_id !== studentProfileId) {
      throw new Error('FORBIDDEN: Cannot edit another student profile');
    }

    // Students can update their own personal/guardian details and provide fee receipt ref
    await this.db.query(
      `UPDATE student_profiles SET
        parent_name = COALESCE($1, parent_name),
        parent_relationship = COALESCE($2, parent_relationship),
        parent_phone = COALESCE($3, parent_phone),
        parent_email = COALESCE($4, parent_email),
        local_guardian_name = COALESCE($5, local_guardian_name),
        local_guardian_relationship = COALESCE($6, local_guardian_relationship),
        local_guardian_phone = COALESCE($7, local_guardian_phone),
        local_guardian_email = COALESCE($8, local_guardian_email),
        local_guardian_address = COALESCE($9, local_guardian_address),
        proctor_name = COALESCE($10, proctor_name),
        proctor_department = COALESCE($11, proctor_department),
        fee_receipt_ref = COALESCE($12, fee_receipt_ref),
        fee_status = CASE 
          WHEN $12 IS NOT NULL AND fee_status = 'UNPAID' THEN 'SUBMITTED' 
          ELSE fee_status 
        END,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $13`,
      [
        data.parent_name || null,
        data.parent_relationship || null,
        data.parent_phone || null,
        data.parent_email || null,
        data.local_guardian_name || null,
        data.local_guardian_relationship || null,
        data.local_guardian_phone || null,
        data.local_guardian_email || null,
        data.local_guardian_address || null,
        data.proctor_name || null,
        data.proctor_department || null,
        data.fee_receipt_ref || null,
        studentProfileId,
      ]
    );

    if (data.phone) {
      const pRes = await this.db.query(`SELECT user_id FROM student_profiles WHERE id = $1`, [studentProfileId]);
      if (pRes.rows.length > 0) {
        await this.db.query(`UPDATE users SET phone = $1 WHERE id = $2`, [data.phone, pRes.rows[0].user_id]);
      }
    }
  }

  async submitStudentProfile(studentProfileId: string, actor: AuthActor): Promise<void> {
    if (actor.role === 'STUDENT' && actor.student_profile_id !== studentProfileId) {
      throw new Error('FORBIDDEN: Cannot submit on behalf of another student');
    }

    await this.db.query(
      `UPDATE student_profiles SET 
        profile_submitted = TRUE, 
        profile_submitted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [studentProfileId]
    );
  }

  /**
   * Authoritative staff-controlled fee verification.
   * Student timestamp or submission is NEVER trusted automatically.
   */
  async verifyFeePayment(
    studentProfileId: string,
    data: {
      status: 'VERIFIED' | 'REJECTED';
      verifiedPaymentTimestamp?: string;
      eligibilityStatus?: 'ELIGIBLE' | 'FEE_PENDING' | 'INELIGIBLE';
    },
    actor: AuthActor
  ): Promise<void> {
    if (!can(actor, 'fee.verify')) {
      throw new Error('FORBIDDEN: Only Hostel Office or Admin can verify fee payment');
    }

    const paymentTs = data.verifiedPaymentTimestamp || new Date().toISOString();
    const eligibility = data.eligibilityStatus || (data.status === 'VERIFIED' ? 'ELIGIBLE' : 'FEE_PENDING');

    await this.db.transaction(async (client) => {
      const prevRes = await client.query(`SELECT * FROM student_profiles WHERE id = $1`, [studentProfileId]);
      if (prevRes.rows.length === 0) throw new Error('NOT_FOUND: Student profile not found');
      const prev = prevRes.rows[0];

      await client.query(
        `UPDATE student_profiles SET
          fee_status = $1,
          fee_payment_timestamp = $2,
          fee_verified_by = $3,
          fee_verified_at = CURRENT_TIMESTAMP,
          eligibility_status = $4,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [data.status, paymentTs, actor.id, eligibility, studentProfileId]
      );

      // Record audit log
      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await client.query(
        `INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before_state, after_state, reason)
         VALUES ($1, $2, 'FEE_VERIFIED', 'STUDENT_PROFILE', $3, $4, $5, $6)`,
        [
          auditId,
          actor.id,
          studentProfileId,
          JSON.stringify({ fee_status: prev.fee_status, eligibility_status: prev.eligibility_status }),
          JSON.stringify({ fee_status: data.status, fee_payment_timestamp: paymentTs, eligibility_status: eligibility }),
          `Authoritative fee verification by ${actor.role}`,
        ]
      );
    });
  }

  /**
   * Deterministic payment-based priority calculation across an allocation pool / academic year.
   * Orders valid verified fee payments chronologically, breaking ties consistently by USN/college_id.
   */
  async recalculatePrioritiesByPayment(
    academicYear: number,
    quotaCategory: string,
    actor: AuthActor
  ): Promise<{ updatedCount: number }> {
    if (!can(actor, 'student.edit_priority')) {
      throw new Error('FORBIDDEN: Only authorized staff can calculate or assign priorities');
    }

    return this.db.transaction(async (client) => {
      const res = await client.query(
        `SELECT id, college_id, fee_payment_timestamp, assigned_priority
         FROM student_profiles
         WHERE academic_year = $1 AND quota_category = $2 AND fee_status = 'VERIFIED'
         ORDER BY fee_payment_timestamp ASC, college_id ASC`,
        [academicYear, quotaCategory]
      );

      let rank = 1;
      let count = 0;
      for (const row of res.rows) {
        if (row.assigned_priority !== rank) {
          await client.query(
            `UPDATE student_profiles SET 
              assigned_priority = $1, 
              priority_assignment_source = 'AUTOMATIC_FEE',
              updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [rank, row.id]
          );

          await client.query(
            `UPDATE waiting_room_entries SET priority_number = $1 WHERE student_id = $2 AND status = 'WAITING'`,
            [rank, row.id]
          );
          count++;
        }
        rank++;
      }
      return { updatedCount: count };
    });
  }

  /**
   * Published Terms & Acknowledgement
   */
  async getLatestTerms() {
    const res = await this.db.query(
      `SELECT * FROM terms_documents WHERE is_published = TRUE ORDER BY version DESC LIMIT 1`
    );
    return res.rows[0] || null;
  }

  async getStudentTermsStatus(studentProfileId: string) {
    const latestTerms = await this.getLatestTerms();
    if (!latestTerms) return { accepted: true, requiredVersion: 0 };

    const ackRes = await this.db.query(
      `SELECT * FROM terms_acknowledgements WHERE student_id = $1 AND terms_version = $2`,
      [studentProfileId, latestTerms.version]
    );

    return {
      accepted: ackRes.rows.length > 0,
      terms: latestTerms,
      acknowledgement: ackRes.rows[0] || null,
    };
  }

  async acceptTerms(studentProfileId: string, termsVersion: number, actor: AuthActor, ipAddress?: string): Promise<void> {
    if (actor.role === 'STUDENT' && actor.student_profile_id !== studentProfileId) {
      throw new Error('FORBIDDEN: Cannot accept terms on behalf of another student');
    }

    const termsRes = await this.db.query(
      `SELECT id FROM terms_documents WHERE version = $1 AND is_published = TRUE`,
      [termsVersion]
    );
    if (termsRes.rows.length === 0) {
      throw new Error('INVALID_TERMS: Specified terms version not found or unpublished');
    }

    const ackId = `ack_${studentProfileId}_v${termsVersion}`;
    await this.db.query(
      `INSERT INTO terms_acknowledgements (id, student_id, terms_document_id, terms_version, ip_address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (student_id, terms_version) DO NOTHING`,
      [ackId, studentProfileId, termsRes.rows[0].id, termsVersion, ipAddress || '127.0.0.1']
    );
  }

  async listStudents(actor: AuthActor, filters?: { academicYear?: number; quota?: string; search?: string }) {
    if (!can(actor, 'student.manage') && !can(actor, 'student.view_self')) {
      throw new Error('FORBIDDEN: Insufficient permissions to view student registry');
    }

    let sql = `
      SELECT sp.*, u.email, u.phone,
             wre.status as waiting_status, wre.priority_number as live_priority,
             a.id as allocation_id, a.seat_id as allocated_seat_id, a.status as allocation_status,
             ta.accepted_at as terms_accepted_at
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN waiting_room_entries wre ON sp.id = wre.student_id
      LEFT JOIN allocations a ON sp.id = a.student_id AND a.status = 'CURRENT'
      LEFT JOIN terms_acknowledgements ta ON sp.id = ta.student_id AND ta.terms_version = 1
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.academicYear) {
      params.push(filters.academicYear);
      sql += ` AND sp.academic_year = $${params.length}`;
    }

    if (filters?.quota) {
      params.push(filters.quota);
      sql += ` AND sp.quota_category = $${params.length}`;
    }

    if (filters?.search) {
      params.push(`%${filters.search}%`);
      sql += ` AND (sp.full_name ILIKE $${params.length} OR sp.college_id ILIKE $${params.length})`;
    }

    sql += ` ORDER BY COALESCE(sp.assigned_priority, 999999) ASC, sp.college_id ASC`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async getProfile(studentProfileId: string, actor: AuthActor) {
    if (!can(actor, 'student.view_self', { resource_type: 'STUDENT', student_id: studentProfileId }) && !can(actor, 'student.manage')) {
      throw new Error('FORBIDDEN: Access denied to student profile');
    }

    const res = await this.db.query(
      `SELECT sp.*, u.email, u.phone, 
              a.seat_id as allocated_seat_id,
              s.seat_label as allocated_seat_label,
              r.room_number as allocated_room_number,
              b.name as allocated_building_name
       FROM student_profiles sp
       JOIN users u ON sp.user_id = u.id
       LEFT JOIN allocations a ON sp.id = a.student_id AND a.status = 'CURRENT'
       LEFT JOIN seats s ON a.seat_id = s.id
       LEFT JOIN rooms r ON s.room_id = r.id
       LEFT JOIN floors fl ON r.floor_id = fl.id
       LEFT JOIN buildings b ON fl.building_id = b.id
       WHERE sp.id = $1`,
      [studentProfileId]
    );

    if (res.rows.length === 0) {
      throw new Error('NOT_FOUND: Student profile not found');
    }

    return res.rows[0];
  }
}
