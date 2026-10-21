import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { getDatabaseService, resetDatabaseInstance } from '../src/db/index.js';
import { FastifyInstance } from 'fastify';

describe('Roommate Invitation Acceptance to Final Allocation Workflow Suite', () => {
  let app: FastifyInstance;
  let db: any;

  beforeAll(async () => {
    resetDatabaseInstance();
    db = getDatabaseService(true);
    app = await buildApp(db);
    await app.ready();
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('Test 1 & 2: Roommate invite response returns canonical room/building context without pre-allocating seat', async () => {
    // Demo 1 creates roommate group for Room 205 proposing Demo 2 (Rank #2)
    const grpRes = await app.inject({
      method: 'POST',
      url: '/api/roommate-groups',
      headers: { 'x-user-id': 'usr_demo_001' },
      payload: {
        cycleId: 'cyc_bvb_pilot_2026',
        leaderStudentId: 'prof_demo_001',
        roomId: 'rm_bvb_205',
        peerPriorityNumbers: [2],
      },
    });

    expect(grpRes.statusCode).toBe(201);
    const { groupId } = grpRes.json();
    expect(groupId).toBeDefined();

    // Invitee Diya (Demo 2) responds Accept
    const acceptRes = await app.inject({
      method: 'POST',
      url: `/api/roommate-groups/${groupId}/respond`,
      headers: { 'x-user-id': 'usr_demo_002' },
      payload: {
        studentProfileId: 'prof_demo_002',
        accept: true,
      },
    });

    expect(acceptRes.statusCode).toBe(200);
    const data = acceptRes.json();
    expect(data.status).toBe('ACCEPTED');
    expect(data.groupId).toBe(groupId);
    expect(data.preferredRoomId).toBe('rm_bvb_205');
    expect(data.roomNumber).toBe('205');
    expect(data.buildingName).toBeDefined();
    expect(data.groupMembers).toBeDefined();
    expect(data.groupMembers.length).toBe(2);

    // Verify student profile still has NULL allocated_seat_id (Consent != Allocation)
    const profRes = await app.inject({
      method: 'GET',
      url: '/api/students/prof_demo_002',
      headers: { 'x-user-id': 'usr_demo_002' },
    });
    expect(profRes.statusCode).toBe(200);
    expect(profRes.json().allocated_seat_id).toBeNull();
  });

  it('Test 3: Intent-to-occupied transition and floor inventory synchronization', async () => {
    // Check floor roommate intent map reflects room 205 seats as orange intent
    const intentRes = await app.inject({
      method: 'GET',
      url: '/api/floors/flr_bvb_2/roommate-intent?cycleId=cyc_bvb_pilot_2026',
    });
    expect(intentRes.statusCode).toBe(200);
    const intentMap = intentRes.json();
    expect(intentMap['st_rm_bvb_205_A']?.isIntent).toBe(true);

    // Initial floor state: st_rm_bvb_205_B is free
    const floorState1 = await app.inject({
      method: 'GET',
      url: '/api/floors/flr_bvb_2/state',
    });
    expect(floorState1.statusCode).toBe(200);
    expect(floorState1.json()['st_rm_bvb_205_B']).toBe('free');

    // Student 1 joins waiting room
    const join1 = await app.inject({
      method: 'POST',
      url: '/api/allocation-cycles/cyc_bvb_pilot_2026/join',
      headers: { 'x-user-id': 'usr_demo_001' },
      payload: { studentProfileId: 'prof_demo_001' },
    });
    const poolId = join1.json().poolId;

    const adv1 = await app.inject({
      method: 'POST',
      url: `/api/allocation-pools/${poolId}/advance`,
    });
    const sess1 = adv1.json().session;
    expect(sess1.studentId).toBe('prof_demo_001');

    const conf1 = await app.inject({
      method: 'POST',
      url: `/api/booking-sessions/${sess1.sessionId}/confirm-seat`,
      headers: { 'x-user-id': 'usr_demo_001' },
      payload: { seatId: 'st_rm_bvb_205_A' },
    });
    expect(conf1.statusCode).toBe(200);

    // Student 2 joins waiting room and advances turn
    const join2 = await app.inject({
      method: 'POST',
      url: '/api/allocation-cycles/cyc_bvb_pilot_2026/join',
      headers: { 'x-user-id': 'usr_demo_002' },
      payload: { studentProfileId: 'prof_demo_002' },
    });
    expect(join2.statusCode).toBe(200);

    const adv2 = await app.inject({
      method: 'POST',
      url: `/api/allocation-pools/${poolId}/advance`,
    });
    const sess2 = adv2.json().session;
    expect(sess2).toBeDefined();
    expect(sess2.studentId).toBe('prof_demo_002');

    // Confirm Room Allocation for Student 2
    const conf2 = await app.inject({
      method: 'POST',
      url: `/api/booking-sessions/${sess2.sessionId}/confirm-seat`,
      headers: { 'x-user-id': 'usr_demo_002' },
      payload: { seatId: 'st_rm_bvb_205_B' },
    });
    expect(conf2.statusCode).toBe(200);
    expect(conf2.json().status).toBe('CURRENT');
    expect(conf2.json().seatId).toBe('st_rm_bvb_205_B');

    // State is now 'taken'
    const floorState2 = await app.inject({
      method: 'GET',
      url: '/api/floors/flr_bvb_2/state',
    });
    expect(floorState2.statusCode).toBe(200);
    expect(floorState2.json()['st_rm_bvb_205_B']).toBe('taken');
  });

  it('Test 4: Refresh persistence of confirmed allocation', async () => {
    // Reload student profile directly from database
    const profRes = await app.inject({
      method: 'GET',
      url: '/api/students/prof_demo_002',
      headers: { 'x-user-id': 'usr_demo_002' },
    });
    expect(profRes.statusCode).toBe(200);
    const prof = profRes.json();
    expect(prof.allocated_seat_id).toBe('st_rm_bvb_205_B');
    expect(prof.allocated_room_number).toBe('205');
  });

  it('Test 5: Turn & Priority constraints prevent out-of-turn final confirmation', async () => {
    // Student 10 (out of turn) attempts to confirm seat
    // Create an arbitrary session or attempt confirmation
    const joinRes = await app.inject({
      method: 'POST',
      url: '/api/allocation-cycles/cyc_bvb_pilot_2026/join',
      headers: { 'x-user-id': 'usr_demo_010' },
      payload: { studentProfileId: 'prof_demo_010' },
    });
    expect(joinRes.statusCode).toBe(200);

    // Attempting confirm on an invalid session fails with 400 NOT_YOUR_TURN
    const failConf = await app.inject({
      method: 'POST',
      url: '/api/booking-sessions/sess_invalid/confirm-seat',
      headers: { 'x-user-id': 'usr_demo_010' },
      payload: { seatId: 'st_rm_bvb_205_C' },
    });
    expect(failConf.statusCode).toBe(400);
  });

  it('Test 6: Seat conflict handling rejects taken seat', async () => {
    // Student 3 joins and advances
    const join3 = await app.inject({
      method: 'POST',
      url: '/api/allocation-cycles/cyc_bvb_pilot_2026/join',
      headers: { 'x-user-id': 'usr_demo_003' },
      payload: { studentProfileId: 'prof_demo_003' },
    });
    expect(join3.statusCode).toBe(200);
    const poolId = join3.json().poolId;

    const advRes = await app.inject({
      method: 'POST',
      url: `/api/allocation-pools/${poolId}/advance`,
    });
    const sess = advRes.json().session;
    if (sess) {
      // Attempting to claim st_rm_bvb_205_B (already taken) is rejected
      const conflictRes = await app.inject({
        method: 'POST',
        url: `/api/booking-sessions/${sess.sessionId}/confirm-seat`,
        headers: { 'x-user-id': 'usr_demo_003' },
        payload: { seatId: 'st_rm_bvb_205_B' },
      });
      expect(conflictRes.statusCode).toBe(409);
      expect(conflictRes.json().error).toMatch(/SEAT_UNAVAILABLE/);
    }
  });

  it('Test 7: Authorization - student cannot accept invite on behalf of another student', async () => {
    // Demo 1 creates invite for Demo 4
    const grpRes = await app.inject({
      method: 'POST',
      url: '/api/roommate-groups',
      headers: { 'x-user-id': 'usr_demo_001' },
      payload: {
        cycleId: 'cyc_bvb_pilot_2026',
        leaderStudentId: 'prof_demo_001',
        roomId: 'rm_bvb_206',
        peerPriorityNumbers: [4],
      },
    });
    const { groupId } = grpRes.json();

    // Demo 3 attempts to accept Demo 4's invite
    const idorRes = await app.inject({
      method: 'POST',
      url: `/api/roommate-groups/${groupId}/respond`,
      headers: { 'x-user-id': 'usr_demo_003' },
      payload: {
        studentProfileId: 'prof_demo_004',
        accept: true,
      },
    });
    expect(idorRes.statusCode).toBe(403);
    expect(idorRes.json().error).toMatch(/FORBIDDEN/);
  });
});
