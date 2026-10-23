import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import { getDatabaseService, resetDatabaseInstance } from '../src/db/index.js';
import { StudentRegistryService } from '../src/student/registry.js';

describe('DORMEX Admissions & Weekly Mess Menu Suite', () => {
  let app: any;
  let db: any;

  beforeAll(async () => {
    resetDatabaseInstance();
    db = getDatabaseService(true);
    const fastifyApp = await buildApp(db);
    await fastifyApp.ready();
    app = fastifyApp.server;
  }, 30000);

  describe('Part B: Student Admission Management', () => {
    it('1. Rejects student or proctor from creating admissions', async () => {
      const studentRes = await request(app)
        .post('/api/admissions')
        .set('x-user-id', 'usr_student_1')
        .set('x-role', 'STUDENT')
        .send({
          academic_year_code: '2026-2027',
          college_id: '1SI26CS099',
          full_name: 'Unauthorized Student Attempt',
          department: 'CSE',
          official_priority: 999,
          email: 'unauth@sit.ac.in',
          phone: '+919876543210',
        });

      expect(studentRes.status).toBe(403);
      expect(studentRes.body.error).toContain('FORBIDDEN');
    });

    it('2. Allows authorized Hostel Office staff to create a valid admission with unique priority', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          academic_year_code: '2026-2027',
          college_id: '1SI26CS101',
          full_name: 'Prajwal Gowda',
          department: 'Computer Science',
          semester: 1,
          official_priority: 101,
          email: 'prajwal.cs@sit.ac.in',
          phone: '+91 94481 23456',
          parent_name: 'Shankar Gowda',
          parent_relationship: 'Father',
          parent_phone: '+91 94481 23450',
          parent_address: 'Tumakuru, Karnataka',
          proctor_user_id: 'usr_proctor_1',
          hostel_building_id: 'bld_bvb',
          notes: 'Direct institutional merit quota candidate',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.college_id).toBe('1SI26CS101');
      expect(res.body.official_priority).toBe(101);
      expect(res.body.admission_status).toBe('PROCTOR_ASSIGNED');
      expect(res.body.proctor_name).toBe('Dr. Mehta (Proctor)');
    });

    it('3. Rejects duplicate USN on admission creation', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          academic_year_code: '2026-2027',
          college_id: '1SI26CS101', // duplicate
          full_name: 'Another Student',
          department: 'ISE',
          official_priority: 102,
          email: 'another@sit.ac.in',
          phone: '+91 98888 77777',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('DUPLICATE_USN');
    });

    it('4. Rejects duplicate official priority number within the same admission batch', async () => {
      // 101 is already claimed by 1SI26CS101 in batch 2026-2027
      const res = await request(app)
        .post('/api/admissions')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          academic_year_code: '2026-2027',
          college_id: '1SI26CS102',
          full_name: 'Kiran Kumar',
          department: 'Civil Engineering',
          official_priority: 101, // duplicate priority in same batch
          email: 'kiran.cv@sit.ac.in',
          phone: '+91 94481 99999',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('DUPLICATE_PRIORITY');
    });

    it('4b. Permits the same official priority number in a different admission batch', async () => {
      // 101 can be reused in batch 2027-2028
      const res = await request(app)
        .post('/api/admissions')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          academic_year_code: '2027-2028',
          college_id: '1SI27CS001',
          full_name: 'Aditi Sharma',
          department: 'Computer Science & Engineering',
          official_priority: 101, // same priority allowed in different batch
          email: 'aditi.27@sit.ac.in',
          phone: '+91 94481 88888',
        });

      expect(res.status).toBe(201);
      expect(res.body.official_priority).toBe(101);
      expect(res.body.academic_year_code).toBe('2027-2028');

      // But another candidate in 2027-2028 cannot claim 101
      const res2 = await request(app)
        .post('/api/admissions')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          academic_year_code: '2027-2028',
          college_id: '1SI27CS002',
          full_name: 'Rohan Verma',
          department: 'Information Science & Engineering',
          official_priority: 101, // rejected: duplicate in 2027-2028
          email: 'rohan.27@sit.ac.in',
          phone: '+91 94481 77777',
        });

      expect(res2.status).toBe(400);
      expect(res2.body.error).toContain('DUPLICATE_PRIORITY');
    });

    it('5. Integrates admission record without falsely granting fee-verified or allocation-eligible status', async () => {
      // Check created student profile in database
      const profileRes = await request(app)
        .get('/api/students/prof_1si26cs101')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE');

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.fee_status).toBe('UNPAID');
      expect(profileRes.body.eligibility_status).toBe('PENDING');
      // assigned_priority is NULL until fee verification and queue rank assignment / recalculation
      expect(profileRes.body.assigned_priority).toBeNull();
    });

    it('6. Lists admissions with search and academic year filters', async () => {
      const listRes = await request(app)
        .get('/api/admissions?search=Prajwal')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE');

      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].college_id).toBe('1SI26CS101');
    });

    it('7. Allows updating permitted admission details', async () => {
      const list = await request(app)
        .get('/api/admissions')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE');

      const admId = list.body[0].id;
      const updateRes = await request(app)
        .put(`/api/admissions/${admId}`)
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          notes: 'Updated verification notes: hostel fee challan pending',
          admission_status: 'DOCS_PENDING',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.admission_status).toBe('DOCS_PENDING');
      expect(updateRes.body.notes).toContain('hostel fee challan pending');
    });

    it('7b. Revalidates batch-wise priority on update and preserves number when editing without conflict', async () => {
      const list = await request(app)
        .get('/api/admissions?search=Prajwal')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE');

      const prajwal = list.body[0];

      // Updating non-priority fields keeps the same priority without self-conflict
      const updateSelfRes = await request(app)
        .put(`/api/admissions/${prajwal.id}`)
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          official_priority: prajwal.official_priority,
          full_name: 'Prajwal H. Gowda',
        });

      expect(updateSelfRes.status).toBe(200);
      expect(updateSelfRes.body.full_name).toBe('Prajwal H. Gowda');
      expect(updateSelfRes.body.official_priority).toBe(prajwal.official_priority);

      // Attempting to change batch to 2027-2028 where priority 101 is already taken by 1SI27CS001 must fail
      const conflictBatchRes = await request(app)
        .put(`/api/admissions/${prajwal.id}`)
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          academic_year_code: '2027-2028',
          official_priority: 101,
        });

      expect(conflictBatchRes.status).toBe(400);
      expect(conflictBatchRes.body.error).toContain('DUPLICATE_PRIORITY');
    });

    it('7c. Migration and profile backfill: assigns defensible cohort from admission or valid USN, never defaulting to fabricated year', async () => {
      // 1. Student with verified admission record (e.g. 1SI26CS101 -> '2026')
      const admProfile = await db.query(
        `SELECT college_id, admission_batch_year FROM student_profiles WHERE college_id = '1SI26CS101'`
      );
      expect(admProfile.rows.length).toBe(1);
      expect(admProfile.rows[0].admission_batch_year).toBe('2026');

      // 2. Student with valid USN but NO admission record (e.g. 1SI23ME045 -> '2023')
      await db.query(`
        INSERT INTO users (id, college_id, email, full_name, password_hash)
        VALUES ('usr_test_usn_backfill', '1SI23ME045', 'usn23@sit.ac.in', 'Direct USN Student', 'hash')
        ON CONFLICT (id) DO NOTHING
      `);
      await db.query(`
        INSERT INTO student_profiles (
          id, user_id, college_id, full_name, academic_year, department, gender, quota_category, eligibility_status
        ) VALUES (
          'prof_test_usn_backfill', 'usr_test_usn_backfill', '1SI23ME045', 'Direct USN Student', 3, 'ME', 'MALE', 'GENERAL', 'PENDING'
        ) ON CONFLICT (id) DO NOTHING
      `);

      // 3. Student with non-standard USN and NO admission record (e.g. DEMO-099)
      await db.query(`
        INSERT INTO users (id, college_id, email, full_name, password_hash)
        VALUES ('usr_test_unknown_backfill', 'DEMO-099', 'unknown@sit.ac.in', 'Unknown Cohort Student', 'hash')
        ON CONFLICT (id) DO NOTHING
      `);
      await db.query(`
        INSERT INTO student_profiles (
          id, user_id, college_id, full_name, academic_year, department, gender, quota_category, eligibility_status
        ) VALUES (
          'prof_test_unknown_backfill', 'usr_test_unknown_backfill', 'DEMO-099', 'Unknown Cohort Student', 1, 'CSE', 'MALE', 'GENERAL', 'PENDING'
        ) ON CONFLICT (id) DO NOTHING
      `);

      // 4. Test malformed lookalike USNs that must remain NULL (unresolved)
      const malformedCases = [
        { id: 'prof_malformed_yr', usn: '1SIXXCS101', desc: 'non-numeric year' },
        { id: 'prof_malformed_dept', usn: '1SI2512101', desc: 'numeric department' },
        { id: 'prof_malformed_suf', usn: '1SI25CS10X', desc: 'non-numeric suffix' },
        { id: 'prof_malformed_len', usn: '1SI25CS10', desc: 'short length' },
      ];

      for (const m of malformedCases) {
        await db.query(`
          INSERT INTO users (id, college_id, email, full_name, password_hash)
          VALUES ('usr_${m.id}', '${m.usn}', '${m.id}@sit.ac.in', '${m.desc}', 'hash')
          ON CONFLICT (id) DO NOTHING
        `);
        await db.query(`
          INSERT INTO student_profiles (
            id, user_id, college_id, full_name, academic_year, department, gender, quota_category, eligibility_status
          ) VALUES (
            '${m.id}', 'usr_${m.id}', '${m.usn}', '${m.desc}', 1, 'CSE', 'MALE', 'GENERAL', 'PENDING'
          ) ON CONFLICT (id) DO NOTHING
        `);
      }

      // Run migration backfill logic again (testing rerun idempotency with strict regex)
      await db.query(`
        UPDATE student_profiles
        SET admission_batch_year = SUBSTRING(sa.academic_year_code FROM 1 FOR 4)
        FROM student_admissions sa
        WHERE student_profiles.college_id = sa.college_id
          AND student_profiles.admission_batch_year IS NULL;
      `);

      try {
        await db.query(`
          UPDATE student_profiles
          SET admission_batch_year = '20' || SUBSTRING(college_id FROM 4 FOR 2)
          WHERE admission_batch_year IS NULL 
            AND college_id ~* '^1SI[0-9]{2}[A-Z]{2}[0-9]{3}$';
        `);
      } catch {
        await db.query(`
          UPDATE student_profiles
          SET admission_batch_year = '20' || SUBSTRING(college_id FROM 4 FOR 2)
          WHERE admission_batch_year IS NULL 
            AND regexp_like(college_id, '^1SI[0-9]{2}[A-Z]{2}[0-9]{3}$');
        `);
      }

      // Verify direct USN was derived cleanly as '2023'
      const derivedRes = await db.query(
        `SELECT admission_batch_year FROM student_profiles WHERE id = 'prof_test_usn_backfill'`
      );
      expect(derivedRes.rows[0].admission_batch_year).toBe('2023');

      // Verify unknown/non-matching format remained NULL, proving NO fabricated 2026 fallback
      const unknownRes = await db.query(
        `SELECT admission_batch_year FROM student_profiles WHERE id = 'prof_test_unknown_backfill'`
      );
      expect(unknownRes.rows[0].admission_batch_year).toBeNull();

      // Verify all malformed cases remain strictly NULL
      for (const m of malformedCases) {
        const mRes = await db.query(
          `SELECT admission_batch_year FROM student_profiles WHERE id = '${m.id}'`
        );
        expect(mRes.rows[0].admission_batch_year).toBeNull();
      }
    });

    it('7d. Confirms assigned_priority enforces pool-scoped uniqueness and allows rank coexistence across different pools', async () => {
      // Note: Seed data creates DEMO-001 with (academic_year=2, quota_category='MERIT', assigned_priority=1).
      // 1. Student in Year 2 GENERAL Pool can have assigned_priority = 1 (different quota_category)
      await db.query(`
        INSERT INTO users (id, college_id, email, full_name, password_hash)
        VALUES ('usr_pool_y2gen_1', '1SI25CS001', 'y2gen1@sit.ac.in', 'Year 2 Gen Candidate', 'hash')
        ON CONFLICT (id) DO NOTHING
      `);
      const y2GenRes = await db.query(`
        INSERT INTO student_profiles (
          id, user_id, college_id, full_name, admission_batch_year, academic_year, department, gender, quota_category, eligibility_status, assigned_priority
        ) VALUES (
          'prof_pool_y2gen_1', 'usr_pool_y2gen_1', '1SI25CS001', 'Year 2 Gen Candidate', '2025', 2, 'CSE', 'MALE', 'GENERAL', 'ELIGIBLE', 1
        ) RETURNING id, academic_year, quota_category, assigned_priority
      `);
      expect(y2GenRes.rows[0].assigned_priority).toBe(1);

      // 2. Student in Year 2 SPORTS Pool can ALSO have assigned_priority = 1 (different quota_category)
      await db.query(`
        INSERT INTO users (id, college_id, email, full_name, password_hash)
        VALUES ('usr_pool_y2sports_1', '1SI25CS002', 'y2sports1@sit.ac.in', 'Year 2 Sports Candidate', 'hash')
        ON CONFLICT (id) DO NOTHING
      `);
      const sportsRes = await db.query(`
        INSERT INTO student_profiles (
          id, user_id, college_id, full_name, admission_batch_year, academic_year, department, gender, quota_category, eligibility_status, assigned_priority
        ) VALUES (
          'prof_pool_y2sports_1', 'usr_pool_y2sports_1', '1SI25CS002', 'Year 2 Sports Candidate', '2025', 2, 'CSE', 'FEMALE', 'SPORTS', 'ELIGIBLE', 1
        ) RETURNING id, academic_year, quota_category, assigned_priority
      `);
      expect(sportsRes.rows[0].assigned_priority).toBe(1);

      // 3. Student in Year 1 GENERAL Pool can ALSO have assigned_priority = 1 (different academic_year)
      await db.query(`
        INSERT INTO users (id, college_id, email, full_name, password_hash)
        VALUES ('usr_pool_y1gen_1', '1SI26CS003', 'y1gen1@sit.ac.in', 'Year 1 Gen Candidate', 'hash')
        ON CONFLICT (id) DO NOTHING
      `);
      const y1Res = await db.query(`
        INSERT INTO student_profiles (
          id, user_id, college_id, full_name, admission_batch_year, academic_year, department, gender, quota_category, eligibility_status, assigned_priority
        ) VALUES (
          'prof_pool_y1gen_1', 'usr_pool_y1gen_1', '1SI26CS003', 'Year 1 Gen Candidate', '2026', 1, 'CSE', 'MALE', 'GENERAL', 'ELIGIBLE', 1
        ) RETURNING id, academic_year, quota_category, assigned_priority
      `);
      expect(y1Res.rows[0].assigned_priority).toBe(1);

      // 4. Duplicate assigned_priority = 1 within the SAME pool (Year 2 GENERAL) must be strictly REJECTED
      let duplicateRejected = false;
      try {
        await db.query(`
          INSERT INTO users (id, college_id, email, full_name, password_hash)
          VALUES ('usr_pool_y2gen_dup', '1SI25CS099', 'y2gen_dup@sit.ac.in', 'Duplicate Gen Candidate', 'hash')
          ON CONFLICT (id) DO NOTHING
        `);
        await db.query(`
          INSERT INTO student_profiles (
            id, user_id, college_id, full_name, admission_batch_year, academic_year, department, gender, quota_category, eligibility_status, assigned_priority
          ) VALUES (
            'prof_pool_y2gen_dup', 'usr_pool_y2gen_dup', '1SI25CS099', 'Duplicate Gen Candidate', '2025', 2, 'CSE', 'MALE', 'GENERAL', 'ELIGIBLE', 1
          )
        `);
      } catch (err: any) {
        duplicateRejected = true;
        expect(err.message).toMatch(/duplicate key value|uq_student_profiles_pool_priority/i);
      }
      expect(duplicateRejected).toBe(true);
    });

    it('7e. Recalculating allocation pool priorities renumbers ranks 1..N within pool without altering official admission priorities', async () => {
      // Create two admitted students with official priority 1 and 2 in student_admissions
      // Verify payment timestamps in Year 3 General pool
      await db.query(`
        INSERT INTO users (id, college_id, email, full_name, password_hash)
        VALUES ('usr_pool_calc_1', '1SI24CS010', 'calc1@sit.ac.in', 'Fee Early Student', 'hash'),
               ('usr_pool_calc_2', '1SI24CS020', 'calc2@sit.ac.in', 'Fee Later Student', 'hash')
        ON CONFLICT (id) DO NOTHING
      `);

      await db.query(`
        INSERT INTO student_admissions (
          id, academic_year_code, college_id, full_name, department, semester, official_priority, admission_status, email, phone
        ) VALUES 
          ('adm_calc_1', '2024-2025', '1SI24CS010', 'Fee Early Student', 'CSE', 5, 45, 'REGISTERED', 'calc1@sit.ac.in', '9000000001'),
          ('adm_calc_2', '2024-2025', '1SI24CS020', 'Fee Later Student', 'CSE', 5, 12, 'REGISTERED', 'calc2@sit.ac.in', '9000000002')
        ON CONFLICT (id) DO NOTHING
      `);

      await db.query(`
        INSERT INTO student_profiles (
          id, user_id, college_id, full_name, admission_batch_year, academic_year, department, gender, quota_category, eligibility_status, fee_status, fee_payment_timestamp, assigned_priority
        ) VALUES 
          ('prof_calc_1', 'usr_pool_calc_1', '1SI24CS010', 'Fee Early Student', '2024', 3, 'CSE', 'MALE', 'GENERAL', 'ELIGIBLE', 'VERIFIED', '2026-08-01T10:00:00Z', NULL),
          ('prof_calc_2', 'usr_pool_calc_2', '1SI24CS020', 'Fee Later Student', '2024', 3, 'CSE', 'MALE', 'GENERAL', 'ELIGIBLE', 'VERIFIED', '2026-08-01T11:00:00Z', NULL)
        ON CONFLICT (id) DO NOTHING
      `);

      // Run priority recalculation for (academic_year = 3, quota_category = 'GENERAL')
      const regService = new StudentRegistryService(db);
      const hostActor = {
        id: 'usr_office',
        role: 'HOSTEL_OFFICE' as const,
        permissions: ['student.edit_priority', 'fee.verify']
      };

      const recalcRes = await regService.recalculatePrioritiesByPayment(3, 'GENERAL', hostActor);
      expect(recalcRes.updatedCount).toBe(2);

      // Early payment gets rank 1, later payment gets rank 2
      const prof1 = await db.query(`SELECT assigned_priority FROM student_profiles WHERE id = 'prof_calc_1'`);
      const prof2 = await db.query(`SELECT assigned_priority FROM student_profiles WHERE id = 'prof_calc_2'`);
      expect(prof1.rows[0].assigned_priority).toBe(1);
      expect(prof2.rows[0].assigned_priority).toBe(2);

      // BUT official admission priorities in student_admissions remain untouched (45 and 12)
      const adm1 = await db.query(`SELECT official_priority FROM student_admissions WHERE id = 'adm_calc_1'`);
      const adm2 = await db.query(`SELECT official_priority FROM student_admissions WHERE id = 'adm_calc_2'`);
      expect(adm1.rows[0].official_priority).toBe(45);
      expect(adm2.rows[0].official_priority).toBe(12);
    });

    it('7f. Updating official admission priority does not mutate or overwrite student_profiles.assigned_priority', async () => {
      // Setup admission and profile with known different values
      await db.query(`
        INSERT INTO users (id, college_id, email, full_name, password_hash)
        VALUES ('usr_sep_test', '1SI25IS050', 'sep@sit.ac.in', 'Separation Test Student', 'hash')
        ON CONFLICT (id) DO NOTHING
      `);
      await db.query(`
        INSERT INTO student_admissions (
          id, academic_year_code, college_id, full_name, department, semester, official_priority, admission_status, email, phone
        ) VALUES 
          ('adm_sep_test', '2025-2026', '1SI25IS050', 'Separation Test Student', 'ISE', 3, 88, 'REGISTERED', 'sep@sit.ac.in', '9000000050')
        ON CONFLICT (id) DO NOTHING
      `);
      await db.query(`
        INSERT INTO student_profiles (
          id, user_id, college_id, full_name, admission_batch_year, academic_year, department, gender, quota_category, eligibility_status, assigned_priority
        ) VALUES 
          ('prof_sep_test', 'usr_sep_test', '1SI25IS050', 'Separation Test Student', '2025', 2, 'ISE', 'FEMALE', 'SPORTS', 'ELIGIBLE', 3)
        ON CONFLICT (id) DO NOTHING
      `);

      // Update official priority from 88 to 89 via admission service API
      const updateRes = await request(app)
        .put('/api/admissions/adm_sep_test')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          official_priority: 89,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.official_priority).toBe(89);

      // Verify official priority updated in student_admissions
      const admCheck = await db.query(`SELECT official_priority FROM student_admissions WHERE id = 'adm_sep_test'`);
      expect(admCheck.rows[0].official_priority).toBe(89);

      // Verify student_profiles.assigned_priority was NOT mutated (still 3)
      const profCheck = await db.query(`SELECT assigned_priority FROM student_profiles WHERE id = 'prof_sep_test'`);
      expect(profCheck.rows[0].assigned_priority).toBe(3);
    });
  });

  describe('Part C: Weekly Mess Menu Management', () => {
    it('8. Rejects student from uploading weekly mess menu', async () => {
      const uploadRes = await request(app)
        .post('/api/mess/menus')
        .set('x-user-id', 'usr_student_1')
        .set('x-role', 'STUDENT')
        .send({
          week_start_date: '2026-10-19',
          week_end_date: '2026-10-25',
          image_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          original_filename: 'menu.png',
          content_type: 'image/png',
        });

      expect(uploadRes.status).toBe(403);
      expect(uploadRes.body.error).toContain('FORBIDDEN');
    });

    it('9. Rejects invalid image MIME format', async () => {
      const uploadRes = await request(app)
        .post('/api/mess/menus')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          week_start_date: '2026-10-19',
          week_end_date: '2026-10-25',
          image_base64: 'data:application/pdf;base64,JVBERi0xLjQK',
          original_filename: 'menu.pdf',
          content_type: 'application/pdf',
        });

      expect(uploadRes.status).toBe(400);
      expect(uploadRes.body.error).toContain('Unsupported file format');
    });

    it('10. Allows Hostel Office staff to upload and publish weekly mess menu', async () => {
      const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const uploadRes = await request(app)
        .post('/api/mess/menus')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          week_start_date: '2026-10-19',
          week_end_date: '2026-10-25',
          mess_scope: 'CAMPUS_CENTRAL',
          image_base64: tinyPngBase64,
          original_filename: 'official_oct_w4_menu.png',
          content_type: 'image/png',
          description: 'Special South Indian festive menu for Ayudha Pooja week',
          publish_immediately: true,
        });

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.id).toBeDefined();
      expect(uploadRes.body.status).toBe('PUBLISHED');
      expect(uploadRes.body.published_at).toBeDefined();
    });

    it('11. Allows student to view active published weekly menu', async () => {
      const activeRes = await request(app)
        .get('/api/mess/menu/active')
        .set('x-user-id', 'usr_demo_001')
        .set('x-role', 'STUDENT');

      expect(activeRes.status).toBe(200);
      expect(activeRes.body).toBeDefined();
      expect(activeRes.body.status).toBe('PUBLISHED');
      expect(activeRes.body.image_url).toContain('data:image/png;base64');
      expect(activeRes.body.description).toContain('Ayudha Pooja week');
    });

    it('12. Emits menu broadcast notification for students without leaking private info', async () => {
      const notifsRes = await request(app)
        .get('/api/notifications')
        .set('x-user-id', 'usr_demo_002')
        .set('x-role', 'STUDENT');

      expect(notifsRes.status).toBe(200);
      const menuNotif = notifsRes.body.notifications.find((n: any) => n.reference_type === 'MESS_MENU');
      expect(menuNotif).toBeDefined();
      expect(menuNotif.title).toBe('Weekly Mess Menu Published');
    });

    it('13. Rejects missing or invalid week start/end dates with field-specific validation errors', async () => {
      const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      
      // Missing dates
      const missingRes = await request(app)
        .post('/api/mess/menus')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          week_start_date: '',
          week_end_date: '',
          image_base64: tinyPngBase64,
          original_filename: 'menu.png',
          content_type: 'image/png'
        });
      expect(missingRes.status).toBe(400);
      expect(missingRes.body.error).toBe('VALIDATION_ERROR: Week start and end dates are required');

      // Invalid start date format
      const invalidStartRes = await request(app)
        .post('/api/mess/menus')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          week_start_date: 'invalid-date',
          week_end_date: '2026-10-25',
          image_base64: tinyPngBase64,
          original_filename: 'menu.png',
          content_type: 'image/png'
        });
      expect(invalidStartRes.status).toBe(400);
      expect(invalidStartRes.body.error).toBe('VALIDATION_ERROR: Week start date must be a valid date in YYYY-MM-DD format');

      // Invalid end date format
      const invalidEndRes = await request(app)
        .post('/api/mess/menus')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          week_start_date: '2026-10-19',
          week_end_date: '25-10-2026',
          image_base64: tinyPngBase64,
          original_filename: 'menu.png',
          content_type: 'image/png'
        });
      expect(invalidEndRes.status).toBe(400);
      expect(invalidEndRes.body.error).toBe('VALIDATION_ERROR: Week end date must be a valid date in YYYY-MM-DD format');
    });

    it('14. Rejects end dates that precede start dates and creates no menu or notification', async () => {
      const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

      const invertedRes = await request(app)
        .post('/api/mess/menus')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          week_start_date: '2026-10-25',
          week_end_date: '2026-10-19',
          image_base64: tinyPngBase64,
          original_filename: 'invalid_order_menu.png',
          content_type: 'image/png',
          publish_immediately: true
        });

      expect(invertedRes.status).toBe(400);
      expect(invertedRes.body.error).toBe('VALIDATION_ERROR: Week end date cannot be earlier than week start date');

      // Verify no notification was published for inverted dates
      const notifsRes = await request(app)
        .get('/api/notifications')
        .set('x-user-id', 'usr_demo_001')
        .set('x-role', 'STUDENT');
      const badNotif = notifsRes.body.notifications.find((n: any) => n.message && n.message.includes('2026-10-25 to 2026-10-19'));
      expect(badNotif).toBeUndefined();
    });

    it('15. Correctly parses stringified JSON payloads without Content-Type header', async () => {
      const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const rawString = JSON.stringify({
        week_start_date: '2026-11-02',
        week_end_date: '2026-11-08',
        mess_scope: 'BVB_MESS',
        image_base64: tinyPngBase64,
        original_filename: 'nov_week1.png',
        content_type: 'image/png',
        description: 'BVB Block First Week of November Menu',
        publish_immediately: true
      });

      // Supertest sending raw string body without application/json (defaults to text/plain)
      const res = await request(app)
        .post('/api/mess/menus')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .set('Content-Type', 'text/plain')
        .send(rawString);

      expect(res.status).toBe(201);
      const data = res.body;
      expect(data.week_start_date).toBe('2026-11-02');
      expect(data.week_end_date).toBe('2026-11-08');
      expect(data.mess_scope).toBe('BVB_MESS');
      expect(data.status).toBe('PUBLISHED');

      // Verify published dates and menu metadata persist on subsequent query
      const listRes = await request(app)
        .get('/api/mess/menus?scope=BVB_MESS')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE');
      expect(listRes.status).toBe(200);
      const persisted = listRes.body.find((m: any) => m.id === data.id);
      expect(persisted).toBeDefined();
      expect(persisted.week_start_date).toBe('2026-11-02');
      expect(persisted.week_end_date).toBe('2026-11-08');
      expect(persisted.mess_scope).toBe('BVB_MESS');
      expect(persisted.description).toBe('BVB Block First Week of November Menu');
    });

    it('16. Allows student portal to query active menu by scope and retrieve upcoming/future menu', async () => {
      // Query active menu for BVB_MESS as student
      const bvbActiveRes = await request(app)
        .get('/api/mess/menu/active?scope=BVB_MESS')
        .set('x-user-id', 'usr_demo_001')
        .set('x-role', 'STUDENT');

      expect(bvbActiveRes.status).toBe(200);
      expect(bvbActiveRes.body).toBeDefined();
      expect(bvbActiveRes.body.mess_scope).toBe('BVB_MESS');
      expect(bvbActiveRes.body.week_start_date).toBe('2026-11-02');
      expect(bvbActiveRes.body.week_end_date).toBe('2026-11-08');
    });

    it('17. Retrieves target week menu by date query parameter for students', async () => {
      // Query specific date covered by BVB_MESS
      const dateRes = await request(app)
        .get('/api/mess/menu/active?scope=BVB_MESS&date=2026-11-05')
        .set('x-user-id', 'usr_demo_001')
        .set('x-role', 'STUDENT');

      expect(dateRes.status).toBe(200);
      expect(dateRes.body.week_start_date).toBe('2026-11-02');
      expect(dateRes.body.week_end_date).toBe('2026-11-08');
    });

    it('18. Updating menu status preserves existing records without duplicating weeks', async () => {
      const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

      // Create draft menu
      const draftRes = await request(app)
        .post('/api/mess/menus')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          week_start_date: '2026-11-09',
          week_end_date: '2026-11-15',
          mess_scope: 'CAMPUS_CENTRAL',
          image_base64: tinyPngBase64,
          original_filename: 'nov_week2.png',
          content_type: 'image/png',
          description: 'November Week 2 Draft Menu',
          publish_immediately: false
        });

      expect(draftRes.status).toBe(201);
      expect(draftRes.body.status).toBe('DRAFT');

      // Publish draft menu via PUT status
      const publishRes = await request(app)
        .put(`/api/mess/menus/${draftRes.body.id}/status`)
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({ status: 'PUBLISHED' });

      expect(publishRes.status).toBe(200);
      expect(publishRes.body.status).toBe('PUBLISHED');

      // Verify no duplicate record exists
      const listRes = await request(app)
        .get('/api/mess/menus?scope=CAMPUS_CENTRAL')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE');

      const matches = listRes.body.filter((m: any) => m.id === draftRes.body.id);
      expect(matches.length).toBe(1);
    });
  });
});
