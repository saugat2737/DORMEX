import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import { getDatabaseService, resetDatabaseInstance } from '../src/db/index.js';

describe('DORMEX BVB Block Floor 2 (30 Students) Pilot Suite', () => {
  let app: any;
  let db: any;

  beforeEach(async () => {
    resetDatabaseInstance();
    db = getDatabaseService(true);
    const fastifyApp = await buildApp(db);
    await fastifyApp.ready();
    app = fastifyApp.server;
  });

  describe('1. Pilot Scope & Synthetic Demo Registry Constraints', () => {
    it('seeds exactly 30 synthetic demo students with identifiers DEMO-001 through DEMO-030', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('x-user-id', 'usr_admin');

      expect(res.status).toBe(200);
      const demoStudents = res.body.filter((s: any) => s.college_id.startsWith('DEMO-'));
      expect(demoStudents.length).toBe(30);

      expect(demoStudents[0].college_id).toBe('DEMO-001');
      expect(demoStudents[0].assigned_priority).toBe(1);
      expect(demoStudents[29].college_id).toBe('DEMO-030');
      expect(demoStudents[29].assigned_priority).toBe(30);
    });

    it('scopes active building to BVB Block and floor to Floor 2', async () => {
      const bldRes = await request(app).get('/api/buildings');
      expect(bldRes.status).toBe(200);
      const bvb = bldRes.body.find((b: any) => b.id === 'bld_bvb');
      expect(bvb).toBeDefined();
      expect(bvb.name).toBe('BVB Block');

      const flrRes = await request(app).get('/api/buildings/bld_bvb/floors');
      expect(flrRes.status).toBe(200);
      const flr2 = flrRes.body.find((f: any) => f.id === 'flr_bvb_2');
      expect(flr2).toBeDefined();
      expect(flr2.floor_number).toBe(2);
    });

    it('preserves all 72 rooms (201-272) from supplied SVG geometry with provisional capacities', async () => {
      const mapRes = await request(app).get('/api/floors/flr_bvb_2/map');
      expect(mapRes.status).toBe(200);
      expect(mapRes.body.bounds).toEqual([0, 0, 900, 650]);

      const roomElements = mapRes.body.elements.filter((el: any) => el.t === 'room');
      expect(roomElements.length).toBe(72);

      // Verify sample room markers
      const room201 = roomElements.find((r: any) => r.label === '201');
      const room272 = roomElements.find((r: any) => r.label === '272');
      expect(room201).toBeDefined();
      expect(room272).toBeDefined();
      expect(room201.meta?.provisional).toBe(true);

      // Check distinct seat records inside room 201
      const seatElements = mapRes.body.elements.filter(
        (el: any) => el.t === 'seat' && el.meta?.roomId === 'rm_bvb_201'
      );
      expect(seatElements.length).toBeGreaterThan(0);
    });
  });

  describe('2. Staff Administrative Authorization & Registry Management', () => {
    it('allows staff to verify eligibility and assign priority, while students are forbidden', async () => {
      // Student 1 attempts to change their own priority -> Forbidden
      const studentForbidden = await request(app)
        .put('/api/students/prof_demo_001/priority')
        .set('x-user-id', 'usr_demo_001')
        .send({ priority: 1 });

      expect(studentForbidden.status).toBe(403);

      // Staff (Super Admin) updates eligibility of DEMO-029 from PENDING to ELIGIBLE
      const staffUpdate = await request(app)
        .put('/api/students/prof_demo_029/eligibility')
        .set('x-user-id', 'usr_admin')
        .send({ status: 'ELIGIBLE' });

      expect(staffUpdate.status).toBe(200);

      // Verify update in registry
      const checkRes = await request(app)
        .get('/api/students/prof_demo_029')
        .set('x-user-id', 'usr_admin');
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.eligibility_status).toBe('ELIGIBLE');
    });

    it('provides operational overview for BVB Block Floor 2 pilot', async () => {
      const ovRes = await request(app)
        .get('/api/admin/overview')
        .set('x-user-id', 'usr_admin');

      expect(ovRes.status).toBe(200);
      expect(ovRes.body.registeredStudents).toBeGreaterThanOrEqual(30);
      expect(ovRes.body.totalRooms).toBeGreaterThanOrEqual(72);
      expect(ovRes.body.totalSeats).toBeGreaterThanOrEqual(180);
      expect(ovRes.body.availableSeats).toBeGreaterThan(0);
    });
  });

  describe('3. End-to-End Pilot Student Allocation Workflow', () => {
    it('executes waiting room -> priority turn -> seat confirmation -> state update -> conflict rejection', async () => {
      // Step A: Demo Student 1 (Priority #1) enters waiting room
      const joinRes = await request(app)
        .post('/api/allocation-cycles/cyc_bvb_pilot_2026/join')
        .set('x-user-id', 'usr_demo_001')
        .send({ studentProfileId: 'prof_demo_001' });

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.status).toBe('WAITING');
      expect(joinRes.body.priorityNumber).toBe(1);
      const poolId = joinRes.body.poolId;

      // Step B: Advance pool turn to grant active booking session
      const advRes = await request(app)
        .post(`/api/allocation-pools/${poolId}/advance`)
        .send();

      expect(advRes.status).toBe(200);
      expect(advRes.body.session).toBeDefined();
      expect(advRes.body.session.studentId).toBe('prof_demo_001');
      const sessionId = advRes.body.session.sessionId;

      // Step C: Confirm seat st_rm_bvb_201_A
      const confirmRes = await request(app)
        .post(`/api/booking-sessions/${sessionId}/confirm-seat`)
        .set('x-user-id', 'usr_demo_001')
        .send({
          seatId: 'st_rm_bvb_201_A',
          idempotencyKey: 'idemp_demo_001',
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.status).toBe('CURRENT');
      expect(confirmRes.body.seatId).toBe('st_rm_bvb_201_A');

      // Step D: Authoritative floor occupancy reflects seat as taken
      const stateRes = await request(app).get('/api/floors/flr_bvb_2/state');
      expect(stateRes.status).toBe(200);
      expect(stateRes.body['st_rm_bvb_201_A']).toBe('taken');

      // Step E: Second student (Demo Student 2) joins and tries to confirm the same seat
      const join2Res = await request(app)
        .post('/api/allocation-cycles/cyc_bvb_pilot_2026/join')
        .set('x-user-id', 'usr_demo_002')
        .send({ studentProfileId: 'prof_demo_002' });
      expect(join2Res.status).toBe(200);

      const adv2Res = await request(app)
        .post(`/api/allocation-pools/${poolId}/advance`)
        .send();
      expect(adv2Res.status).toBe(200);
      const sess2Id = adv2Res.body.session.sessionId;

      const conflictRes = await request(app)
        .post(`/api/booking-sessions/${sess2Id}/confirm-seat`)
        .set('x-user-id', 'usr_demo_002')
        .send({ seatId: 'st_rm_bvb_201_A' });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error).toContain('SEAT_UNAVAILABLE');
    });
  });
});
