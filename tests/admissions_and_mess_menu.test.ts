import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import { getDatabaseService, resetDatabaseInstance } from '../src/db/index.js';

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

    it('4. Rejects duplicate official priority number globally', async () => {
      // 101 is already claimed by 1SI26CS101
      const res = await request(app)
        .post('/api/admissions')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          academic_year_code: '2026-2027',
          college_id: '1SI26CS102',
          full_name: 'Kiran Kumar',
          department: 'Civil Engineering',
          official_priority: 101, // duplicate priority
          email: 'kiran.cv@sit.ac.in',
          phone: '+91 94481 99999',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('DUPLICATE_PRIORITY');
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
      expect(profileRes.body.assigned_priority).toBe(101);
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
  });
});
