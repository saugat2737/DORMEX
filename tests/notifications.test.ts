import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import { getDatabaseService, resetDatabaseInstance } from '../src/db/index.js';

describe('DORMEX Notification & Announcement System Suite', () => {
  let app: any;
  let db: any;

  beforeAll(async () => {
    resetDatabaseInstance();
    db = getDatabaseService(true);
    const fastifyApp = await buildApp(db);
    await fastifyApp.ready();
    app = fastifyApp.server;
  }, 30000);

  it('1. Retrieves notifications for student and includes seeded notices with unread count', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('x-user-id', 'usr_student_1')
      .set('x-role', 'STUDENT');

    expect(res.status).toBe(200);
    expect(res.body.notifications).toBeDefined();
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.unreadCount).toBeGreaterThan(0);

    const hasNotice = res.body.notifications.some((n: any) => n.category === 'NOTICE');
    expect(hasNotice).toBe(true);
  });

  it('2. Allows admin to broadcast official notice and rejects unauthorized student', async () => {
    // 2a. Student attempt is rejected with 403 Forbidden
    const studentAttempt = await request(app)
      .post('/api/admin/notices')
      .set('x-user-id', 'usr_student_1')
      .set('x-role', 'STUDENT')
      .send({
        title: 'Unauthorized Student Notice',
        message: 'This should fail',
      });

    expect(studentAttempt.status).toBe(403);
    expect(studentAttempt.body.error).toContain('FORBIDDEN');

    // 2b. Chief Warden broadcasts official notice
    const adminNoticeRes = await request(app)
      .post('/api/admin/notices')
      .set('x-user-id', 'usr_chief')
      .set('x-role', 'CHIEF_WARDEN')
      .send({
        title: 'BVB Block Scheduled Maintenance Window',
        message: 'Floor 2 electrical inspection will occur this Wednesday between 10 AM and 1 PM.',
        category: 'NOTICE',
        priority: 'URGENT',
        target_audience: 'ALL',
      });

    expect(adminNoticeRes.status).toBe(201);
    expect(adminNoticeRes.body.id).toBeDefined();
    expect(adminNoticeRes.body.title).toBe('BVB Block Scheduled Maintenance Window');
    expect(adminNoticeRes.body.priority).toBe('URGENT');
  });

  it('3. Automatically creates notification when a public complaint is submitted', async () => {
    const cmpRes = await request(app)
      .post('/api/complaints')
      .set('x-user-id', 'usr_student_1')
      .set('x-role', 'STUDENT')
      .send({
        type: 'PUBLIC',
        building_id: 'bld_bvb',
        title: 'Corridor 2B Emergency Exit Light Non-Functional',
        description: 'The green illuminated exit sign above door 245 is completely unlit.',
      });

    expect(cmpRes.status).toBe(201);
    const complaintId = cmpRes.body.complaintId;
    expect(complaintId).toBeDefined();

    // Verify complaint notification appears in notifications feed
    const notifsRes = await request(app)
      .get('/api/notifications')
      .set('x-user-id', 'usr_student_2')
      .set('x-role', 'STUDENT');

    expect(notifsRes.status).toBe(200);
    const notif = notifsRes.body.notifications.find((n: any) => n.reference_id === complaintId);
    expect(notif).toBeDefined();
    expect(notif.category).toBe('COMPLAINT');
    expect(notif.title).toContain('Corridor 2B Emergency Exit Light');
  });

  it('4. Marks an individual notification as read', async () => {
    const listRes = await request(app)
      .get('/api/notifications')
      .set('x-user-id', 'usr_student_1')
      .set('x-role', 'STUDENT');

    const unread = listRes.body.notifications.find((n: any) => !n.is_read);
    expect(unread).toBeDefined();

    const markRes = await request(app)
      .post('/api/notifications/mark-read')
      .set('x-user-id', 'usr_student_1')
      .set('x-role', 'STUDENT')
      .send({ id: unread.id });

    expect(markRes.status).toBe(200);
    expect(markRes.body.success).toBe(true);

    // Verify marked read in subsequent fetch
    const updatedList = await request(app)
      .get('/api/notifications')
      .set('x-user-id', 'usr_student_1')
      .set('x-role', 'STUDENT');

    const checked = updatedList.body.notifications.find((n: any) => n.id === unread.id);
    expect(checked.is_read).toBe(true);
  });

  it('5. Marks all notifications as read for current user', async () => {
    const markAllRes = await request(app)
      .post('/api/notifications/mark-read')
      .set('x-user-id', 'usr_student_1')
      .set('x-role', 'STUDENT')
      .send({ all: true });

    expect(markAllRes.status).toBe(200);
    expect(markAllRes.body.success).toBe(true);

    const checkRes = await request(app)
      .get('/api/notifications')
      .set('x-user-id', 'usr_student_1')
      .set('x-role', 'STUDENT');

    expect(checkRes.body.unreadCount).toBe(0);
    const remainingUnread = checkRes.body.notifications.filter((n: any) => !n.is_read);
    expect(remainingUnread.length).toBe(0);
  });

  it('6. Emits certified allocation results notification upon cycle publication', async () => {
    const pubRes = await request(app)
      .put('/api/allocation-cycles/cyc_bvb_yr2_pilot/status')
      .set('x-user-id', 'usr_admin')
      .set('x-role', 'SUPER_ADMIN')
      .send({ status: 'PUBLISHED' });

    expect(pubRes.status).toBe(200);

    const notifs = await request(app)
      .get('/api/notifications')
      .set('x-user-id', 'usr_student_3')
      .set('x-role', 'STUDENT');

    expect(notifs.status).toBe(200);
    const pubNotif = notifs.body.notifications.find(
      (n: any) => n.reference_id === 'cyc_bvb_yr2_pilot' && n.category === 'ALLOTMENT'
    );
    expect(pubNotif).toBeDefined();
    expect(pubNotif.title).toContain('Official Allocation Results Certified');
  });
});
