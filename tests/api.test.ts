import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import { getDatabaseService, resetDatabaseInstance } from '../src/db/index.js';

describe('DORMEX End-to-End API Integration Suite', () => {
  let app: any;
  let db: any;

  beforeEach(async () => {
    resetDatabaseInstance();
    db = getDatabaseService(true);
    const fastifyApp = await buildApp(db);
    await fastifyApp.ready();
    app = fastifyApp.server;
  });

  it('GET /health returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  it('GET /api/floors/:id/svg renders SVG map overlay with seat availability', async () => {
    const res = await request(app).get('/api/floors/flr_aryabhata_1/svg');
    const content = res.text || res.body?.toString() || '';
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/svg+xml');
    expect(content).toContain('<svg');
    expect(content).toContain('dormex-floor-map');
    expect(content).toContain('seat-free');
  });

  it('End-to-End Student Allocation Flow: Join -> Advance Turn -> Confirm Seat', async () => {
    // 1. Join waiting room as Student 1
    const joinRes = await request(app)
      .post('/api/allocation-cycles/cyc_fall_2026/join')
      .set('x-user-id', 'usr_student_1')
      .send({ studentProfileId: 'prof_stu_1' });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.status).toBe('WAITING');

    // 2. Advance pool turn
    const advanceRes = await request(app)
      .post(`/api/allocation-pools/${joinRes.body.poolId}/advance`)
      .send();

    expect(advanceRes.status).toBe(200);
    expect(advanceRes.body.session).toBeDefined();
    const sessionId = advanceRes.body.session.sessionId;

    // 3. Confirm seat
    const confirmRes = await request(app)
      .post(`/api/booking-sessions/${sessionId}/confirm-seat`)
      .set('x-user-id', 'usr_student_1')
      .send({
        seatId: 'st_rm_aryabhata_101_A',
        idempotencyKey: 'idemp_e2e_001',
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.status).toBe('CURRENT');
    expect(confirmRes.body.seatId).toBe('st_rm_aryabhata_101_A');

    // 4. Verify SVG map now reflects seat taken
    const svgRes = await request(app).get('/api/floors/flr_aryabhata_1/svg');
    const svgContent = svgRes.text || svgRes.body?.toString() || '';
    expect(svgRes.status).toBe(200);
    expect(svgContent).toContain('seat-taken');
  });
});
