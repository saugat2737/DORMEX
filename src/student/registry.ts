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

  async getProfile(studentProfileId: string, actor: AuthActor) {
    if (!can(actor, 'student.view_self', { resource_type: 'STUDENT', student_id: studentProfileId })) {
      throw new Error('FORBIDDEN: Access denied to student profile');
    }

    const res = await this.db.query(
      `SELECT sp.*, u.email, u.phone FROM student_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.id = $1`,
      [studentProfileId]
    );

    if (res.rows.length === 0) {
      throw new Error('NOT_FOUND: Student profile not found');
    }

    return res.rows[0];
  }
}
