import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import { getDatabaseService, resetDatabaseInstance } from '../src/db/index.js';

describe('DORMEX Phase 2: Frontend & Map Integration Verifications', () => {
  let app: any;
  let db: any;

  beforeAll(async () => {
    resetDatabaseInstance();
    db = getDatabaseService(true);
    const fastifyApp = await buildApp(db);
    await fastifyApp.ready();
    app = fastifyApp.server;
  }, 30000);

  describe('Vertical Slice A: Admin Floor Plan Maker Lifecycle', () => {
    it('creates draft geometry, saves it, and publishes an immutable version', async () => {
      const geometry = {
        version: 1,
        unit: 'cm',
        bounds: [0, 0, 3000, 1500],
        elements: [
          { t: 'wall', pts: [[0, 0], [3000, 0]] },
          { t: 'room', id: 'rm_aryabhata_201', label: '201', poly: [[0, 0], [500, 0], [500, 400], [0, 400]] },
          { t: 'seat', id: 'st_rm_aryabhata_201_A', label: 'A', pos: [50, 50], size: [90, 180] },
        ],
      };

      // 1. Save Draft as Super Admin
      const draftRes = await request(app)
        .post('/api/floors/flr_aryabhata_2/draft')
        .set('x-user-id', 'usr_admin')
        .send({ geometry });

      expect(draftRes.status).toBe(201);
      expect(draftRes.body.version).toBeDefined();

      // 2. Publish map version
      const publishRes = await request(app)
        .post('/api/floors/flr_aryabhata_2/publish')
        .set('x-user-id', 'usr_admin')
        .send({ version: draftRes.body.version });

      expect(publishRes.status).toBe(200);
      expect(publishRes.body.success).toBe(true);

      // 3. Student can view published map
      const mapRes = await request(app)
        .get('/api/floors/flr_aryabhata_2/map')
        .set('x-user-id', 'usr_student_1');

      expect(mapRes.status).toBe(200);
      expect(mapRes.body.elements.length).toBe(3);
    });

    it('rejects student attempting to save or publish floor plans', async () => {
      const draftRes = await request(app)
        .post('/api/floors/flr_aryabhata_1/draft')
        .set('x-user-id', 'usr_student_1')
        .send({ geometry: { version: 1, bounds: [0, 0, 100, 100], elements: [] } });

      expect(draftRes.status).toBe(403);
    });
  });

  describe('Vertical Slice B: Live Student Waiting Room & Map Allocation', () => {
    it('executes full student turn lifecycle and updates live floor map state', async () => {
      // 1. Check initial floor occupancy
      const initialStatesRes = await request(app).get('/api/floors/flr_aryabhata_1/state');
      expect(initialStatesRes.status).toBe(200);
      expect(initialStatesRes.body['st_rm_aryabhata_101_A']).toBe('free');

      // 2. Student 1 enters waiting room
      const joinRes = await request(app)
        .post('/api/allocation-cycles/cyc_fall_2026/join')
        .set('x-user-id', 'usr_student_1')
        .send({ studentProfileId: 'prof_stu_1' });
      expect(joinRes.status).toBe(200);

      // 3. Pool advances turn
      const advRes = await request(app)
        .post(`/api/allocation-pools/${joinRes.body.poolId}/advance`)
        .send();
      expect(advRes.status).toBe(200);
      const session = advRes.body.session;
      expect(session.studentId).toBe('prof_stu_1');

      // 4. Student confirms seat
      const confirmRes = await request(app)
        .post(`/api/booking-sessions/${session.sessionId}/confirm-seat`)
        .set('x-user-id', 'usr_student_1')
        .send({ seatId: 'st_rm_aryabhata_101_A' });
      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.status).toBe('CURRENT');

      // 5. Dynamic seat state immediately updates to 'taken'
      const updatedStatesRes = await request(app).get('/api/floors/flr_aryabhata_1/state');
      expect(updatedStatesRes.status).toBe(200);
      expect(updatedStatesRes.body['st_rm_aryabhata_101_A']).toBe('taken');
    });
  });

  describe('Vertical Slice C: Brand Identity Favicon Integration', () => {
    it('verifies index.html links to authentic brand favicon assets', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('rel="icon" type="image/x-icon" href="/favicon.ico"');
      expect(res.text).toContain('rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"');
      expect(res.text).toContain('rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"');
      expect(res.text).toContain('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"');
    });

    it('successfully serves favicon.ico and favicon-32x32.png static assets', async () => {
      const icoRes = await request(app).get('/favicon.ico');
      expect(icoRes.status).toBe(200);

      const pngRes = await request(app).get('/favicon-32x32.png');
      expect(pngRes.status).toBe(200);
      expect(pngRes.headers['content-type']).toContain('image/png');
    });
  });

  describe('Vertical Slice D: End-to-End Student Mess Menu Viewer', () => {
    it('verifies upload-to-student-read flow across scopes and future dates without timezone shifts', async () => {
      const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

      // 1. Admin uploads and publishes weekly mess menu for upcoming week with scope BVB_MESS
      const uploadRes = await request(app)
        .post('/api/mess/menus')
        .set('x-user-id', 'usr_office')
        .set('x-role', 'HOSTEL_OFFICE')
        .send({
          week_start_date: '2026-11-16',
          week_end_date: '2026-11-22',
          mess_scope: 'BVB_MESS',
          image_base64: tinyPngBase64,
          original_filename: 'nov_week3_bvb.png',
          content_type: 'image/png',
          description: 'Special South Indian menu for November Week 3',
          publish_immediately: true,
        });

      expect(uploadRes.status).toBe(201);
      const menu = uploadRes.body;
      expect(menu.id).toBeDefined();
      expect(menu.week_start_date).toBe('2026-11-16');
      expect(menu.week_end_date).toBe('2026-11-22');
      expect(menu.status).toBe('PUBLISHED');

      // 2. Student queries active menu for BVB_MESS
      const studentActiveRes = await request(app)
        .get('/api/mess/menu/active?scope=BVB_MESS')
        .set('x-user-id', 'usr_student_1')
        .set('x-role', 'STUDENT');

      expect(studentActiveRes.status).toBe(200);
      expect(studentActiveRes.body).toBeDefined();
      expect(studentActiveRes.body.id).toBe(menu.id);
      expect(studentActiveRes.body.week_start_date).toBe('2026-11-16');
      expect(studentActiveRes.body.week_end_date).toBe('2026-11-22');
      expect(studentActiveRes.body.mess_scope).toBe('BVB_MESS');
      expect(studentActiveRes.body.image_url).toBe(menu.image_url);

      // 3. Student queries menu list (archive / all published)
      const studentListRes = await request(app)
        .get('/api/mess/menus?scope=BVB_MESS')
        .set('x-user-id', 'usr_student_1')
        .set('x-role', 'STUDENT');

      expect(studentListRes.status).toBe(200);
      const retrieved = studentListRes.body.find((m: any) => m.id === menu.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.status).toBe('PUBLISHED');
      expect(retrieved.week_start_date).toBe('2026-11-16');
      expect(retrieved.week_end_date).toBe('2026-11-22');
    });
  });
});
