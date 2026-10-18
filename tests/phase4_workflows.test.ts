import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { FastifyInstance } from 'fastify';

describe('DORMEX Phase 4: Workflows, Onboarding, Roommates & Administration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  }, 30000);

  describe('1. Student Registration & Profile Submission', () => {
    it('allows a student to update their personal and guardian profile details', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/students/prof_demo_029/profile',
        headers: { 'x-user-id': 'usr_demo_029' },
        payload: {
          phone: '+91 99887 76655',
          parent_name: 'Mr. Ramesh Pandey',
          parent_relationship: 'Father',
          parent_phone: '+91 99887 70000',
          parent_email: 'ramesh.pandey@example.com',
          fee_receipt_ref: 'FEE-2026-BVB-029',
        },
      });

      expect(res.statusCode).toBe(200);

      const profileRes = await app.inject({
        method: 'GET',
        url: '/api/students/prof_demo_029',
        headers: { 'x-user-id': 'usr_demo_029' },
      });

      const profile = profileRes.json();
      expect(profile.parent_name).toBe('Mr. Ramesh Pandey');
      expect(profile.fee_receipt_ref).toBe('FEE-2026-BVB-029');
    });

    it('forbids a student from modifying another student profile', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/students/prof_demo_001/profile',
        headers: { 'x-user-id': 'usr_demo_029' },
        payload: {
          parent_name: 'Malicious Change',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('2. Mandatory Terms Acknowledgement Workflow', () => {
    it('prevents a student from joining waiting room before accepting published terms', async () => {
      // prof_demo_029 has not yet accepted terms v1
      const res = await app.inject({
        method: 'POST',
        url: '/api/allocation-cycles/cyc_bvb_pilot_2026/join',
        headers: { 'x-user-id': 'usr_demo_029' },
        payload: { studentProfileId: 'prof_demo_029' },
      });

      // Must be rejected with terms requirement or ineligibility
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      const data = res.json();
      expect(data.error).toBeDefined();
    });

    it('records authoritative terms acceptance with server timestamp', async () => {
      const acceptRes = await app.inject({
        method: 'POST',
        url: '/api/students/prof_demo_029/accept-terms',
        headers: { 'x-user-id': 'usr_demo_029' },
        payload: { termsVersion: 1 },
      });

      expect(acceptRes.statusCode).toBe(200);

      const statusRes = await app.inject({
        method: 'GET',
        url: '/api/students/prof_demo_029/terms-status',
        headers: { 'x-user-id': 'usr_demo_029' },
      });

      const status = statusRes.json();
      expect(status.accepted).toBe(true);
      expect(status.acknowledgement).toBeDefined();
    });
  });

  describe('3. Staff Fee Verification & Priority Recalculation', () => {
    it('forbids students from verifying fees or updating priority', async () => {
      const feeRes = await app.inject({
        method: 'PUT',
        url: '/api/students/prof_demo_030/verify-fee',
        headers: { 'x-user-id': 'usr_demo_030' },
        payload: { status: 'VERIFIED' },
      });
      expect(feeRes.statusCode).toBe(403);

      const prioRes = await app.inject({
        method: 'POST',
        url: '/api/students/recalculate-priorities',
        headers: { 'x-user-id': 'usr_demo_030' },
        payload: { academicYear: 2, quotaCategory: 'GENERAL' },
      });
      expect(prioRes.statusCode).toBe(403);
    });

    it('allows Hostel Office staff to verify fees and recalculate priorities chronologically', async () => {
      const feeRes = await app.inject({
        method: 'PUT',
        url: '/api/students/prof_demo_030/verify-fee',
        headers: { 'x-user-id': 'usr_office' },
        payload: {
          status: 'VERIFIED',
          verifiedPaymentTimestamp: new Date(Date.UTC(2026, 7, 10, 9, 30, 0)).toISOString(),
          eligibilityStatus: 'ELIGIBLE',
        },
      });
      expect(feeRes.statusCode).toBe(200);

      const recalcRes = await app.inject({
        method: 'POST',
        url: '/api/students/recalculate-priorities',
        headers: { 'x-user-id': 'usr_office' },
        payload: { academicYear: 2, quotaCategory: 'GENERAL' },
      });
      expect(recalcRes.statusCode).toBe(200);
      const data = recalcRes.json();
      expect(data.success).toBe(true);
    });
  });

  describe('4. Roommate Group Coordination & Seat Intent', () => {
    it('allows a student to create a roommate group preference using priority numbers', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/roommate-groups',
        headers: { 'x-user-id': 'usr_demo_001' },
        payload: {
          cycleId: 'cyc_bvb_pilot_2026',
          leaderStudentId: 'prof_demo_001',
          roomId: 'rm_bvb_202',
          peerPriorityNumbers: [2, 3],
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.groupId).toBeDefined();
      expect(data.invitedCount).toBe(2);
    });

    it('surfaces active roommate group intent for the room seats as orange intent', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/floors/flr_bvb_2/roommate-intent?cycleId=cyc_bvb_pilot_2026',
      });

      expect(res.statusCode).toBe(200);
      const map = res.json();
      // Unallocated seats in rm_bvb_202 should have isIntent: true
      const seatIds = Object.keys(map);
      expect(seatIds.length).toBeGreaterThanOrEqual(1);
      expect(map[seatIds[0]].isIntent).toBe(true);
    });

    it('requires recipient acceptance for roommate group coordination', async () => {
      const groupsRes = await app.inject({
        method: 'GET',
        url: '/api/roommate-groups/student/prof_demo_002?cycleId=cyc_bvb_pilot_2026',
        headers: { 'x-user-id': 'usr_demo_002' },
      });

      expect(groupsRes.statusCode).toBe(200);
      const groups = groupsRes.json();
      expect(groups.incoming.length).toBeGreaterThan(0);

      const targetGroup = groups.incoming[0];
      const respRes = await app.inject({
        method: 'POST',
        url: `/api/roommate-groups/${targetGroup.group_id}/respond`,
        headers: { 'x-user-id': 'usr_demo_002' },
        payload: {
          studentProfileId: 'prof_demo_002',
          accept: true,
        },
      });

      expect(respRes.statusCode).toBe(200);
      expect(respRes.json().status).toBe('ACCEPTED');
    });
  });

  describe('5. 48-Hour Room Change Workflow & Administrative Review', () => {
    it('allows allocated student to submit room change request during the open window', async () => {
      // Step A: Ensure student 1 is allocated a seat
      const joinRes = await app.inject({
        method: 'POST',
        url: '/api/allocation-cycles/cyc_bvb_pilot_2026/join',
        headers: { 'x-user-id': 'usr_demo_001' },
        payload: { studentProfileId: 'prof_demo_001' },
      });
      expect(joinRes.statusCode).toBe(200);

      const poolRes = await app.inject({
        method: 'POST',
        url: `/api/allocation-pools/${joinRes.json().poolId}/advance`,
      });
      const sess = poolRes.json().session;
      expect(sess).toBeDefined();
      expect(sess.studentId).toBe('prof_demo_001');

      const confRes = await app.inject({
        method: 'POST',
        url: `/api/booking-sessions/${sess.sessionId}/confirm-seat`,
        headers: { 'x-user-id': 'usr_demo_001' },
        payload: { seatId: 'st_rm_bvb_201_A' },
      });
      expect(confRes.statusCode).toBe(200);

      // Step B: Submit room change request for target room
      const rcRes = await app.inject({
        method: 'POST',
        url: '/api/room-change-requests',
        headers: { 'x-user-id': 'usr_demo_001' },
        payload: {
          cycleId: 'cyc_bvb_pilot_2026',
          studentProfileId: 'prof_demo_001',
          targetRoomId: 'rm_bvb_203',
          reason: 'Academic study group proximity',
        },
      });

      if (rcRes.statusCode !== 201) {
        console.error('rcRes error payload:', rcRes.body);
      }
      expect(rcRes.statusCode).toBe(201);
      const rcData = rcRes.json();
      expect(rcData.requestId).toBeDefined();

      // Step C: Staff reviews and approves room change atomically
      const reviewRes = await app.inject({
        method: 'PUT',
        url: `/api/room-change-requests/${rcData.requestId}/review`,
        headers: { 'x-user-id': 'usr_admin' },
        payload: {
          decision: 'APPROVED',
          notes: 'Approved by Administration',
        },
      });

      expect(reviewRes.statusCode).toBe(200);

      // Verify student's allocation moved to target room
      const profRes = await app.inject({
        method: 'GET',
        url: '/api/students/prof_demo_001',
        headers: { 'x-user-id': 'usr_demo_001' },
      });
      const updatedProf = profRes.json();
      expect(updatedProf.allocated_seat_id).toMatch(/st_rm_bvb_203_/);
    });
  });
});
