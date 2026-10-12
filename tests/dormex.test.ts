import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabaseService, resetDatabaseInstance } from '../src/db/index.js';
import { runMigrations } from '../src/db/schema.js';
import { seedDatabase } from '../src/db/seed.js';
import { can, AuthActor } from '../src/auth/policy.js';
import { AllocationEngineService } from '../src/allocation/engine.js';
import { OperationsService } from '../src/operations/service.js';
import { PreferencesService } from '../src/preferences/service.js';

describe('DORMEX Comprehensive Verification Suite', () => {
  let db: any;
  let engine: AllocationEngineService;
  let operations: OperationsService;
  let preferences: PreferencesService;

  beforeEach(async () => {
    resetDatabaseInstance();
    db = getDatabaseService(true); // use in-memory Postgres
    await runMigrations(db);
    await seedDatabase(db);
    engine = new AllocationEngineService(db);
    operations = new OperationsService(db);
    preferences = new PreferencesService(db);
  });

  describe('1. Centralized Authorization & Security Boundaries', () => {
    it('prevents students from accessing administrative operations or editing priority', () => {
      const studentActor: AuthActor = {
        id: 'usr_student_1',
        college_id: 'USN202401',
        role: 'STUDENT',
        scope_type: 'STUDENT',
        student_profile_id: 'prof_stu_1',
      };

      expect(can(studentActor, 'student.edit_priority')).toBe(false);
      expect(can(studentActor, 'cycle.manage')).toBe(false);
      expect(can(studentActor, 'floor_plan.publish')).toBe(false);
      expect(can(studentActor, 'allocation.override')).toBe(false);
      expect(can(studentActor, 'allocation.confirm')).toBe(true);
    });

    it('enforces building scoping on Warden (cannot mutate or access another building)', () => {
      const wardenActor: AuthActor = {
        id: 'usr_warden_a',
        college_id: 'WRD001',
        role: 'WARDEN',
        scope_type: 'BUILDING',
        scope_id: 'bld_aryabhata',
      };

      // Target own building
      expect(can(wardenActor, 'complaint.manage', {
        resource_type: 'BUILDING',
        building_id: 'bld_aryabhata',
      })).toBe(true);

      // Target other building Block B
      expect(can(wardenActor, 'complaint.manage', {
        resource_type: 'BUILDING',
        building_id: 'bld_bhaskara',
      })).toBe(false);
    });

    it('Chief Warden has global building authorization while Proctor has no allocation authority', () => {
      const chiefWarden: AuthActor = {
        id: 'usr_chief',
        college_id: 'CW001',
        role: 'CHIEF_WARDEN',
        scope_type: 'SYSTEM',
      };
      const proctor: AuthActor = {
        id: 'usr_proctor_1',
        college_id: 'PRC001',
        role: 'PROCTOR',
        scope_type: 'SYSTEM',
      };

      expect(can(chiefWarden, 'inventory.manage', { resource_type: 'BUILDING', building_id: 'bld_bhaskara' })).toBe(true);
      expect(can(proctor, 'allocation.confirm')).toBe(false);
      expect(can(proctor, 'allocation.override')).toBe(false);
    });
  });

  describe('2. Allocation Engine: Turns, Concurrency, and Invariants', () => {
    it('manages waiting room joins and computes turn queue', async () => {
      const student1: AuthActor = {
        id: 'usr_student_1',
        college_id: 'USN202401',
        role: 'STUDENT',
        scope_type: 'STUDENT',
        student_profile_id: 'prof_stu_1',
      };
      const student3: AuthActor = {
        id: 'usr_student_3',
        college_id: 'USN202403',
        role: 'STUDENT',
        scope_type: 'STUDENT',
        student_profile_id: 'prof_stu_3',
      };

      const res1 = await engine.joinWaitingRoom('cyc_fall_2026', 'prof_stu_1', student1);
      expect(res1.status).toBe('WAITING');
      expect(res1.priorityNumber).toBe(1);

      const res3 = await engine.joinWaitingRoom('cyc_fall_2026', 'prof_stu_3', student3);
      expect(res3.status).toBe('WAITING');
      expect(res3.priorityNumber).toBe(2);

      // Advance turn: only Student 1 gets the turn
      const session = await engine.advancePoolTurn(res1.poolId);
      expect(session).not.toBeNull();
      expect(session?.studentId).toBe('prof_stu_1');
      expect(session?.status).toBe('ACTIVE');
    });

    it('rejects confirmation if not the active turn owner', async () => {
      const student1: AuthActor = {
        id: 'usr_student_1',
        college_id: 'USN202401',
        role: 'STUDENT',
        scope_type: 'STUDENT',
        student_profile_id: 'prof_stu_1',
      };
      const student3: AuthActor = {
        id: 'usr_student_3',
        college_id: 'USN202403',
        role: 'STUDENT',
        scope_type: 'STUDENT',
        student_profile_id: 'prof_stu_3',
      };

      await engine.joinWaitingRoom('cyc_fall_2026', 'prof_stu_1', student1);
      const session = await engine.advancePoolTurn('pool_yr2_general');

      // Student 3 attempts to confirm Student 1's turn
      await expect(
        engine.confirmSeat(session!.sessionId, 'st_rm_aryabhata_101_A', student3)
      ).rejects.toThrow('NOT_YOUR_TURN');
    });

    it('confirms seat atomically and enforces idempotency', async () => {
      const student1: AuthActor = {
        id: 'usr_student_1',
        college_id: 'USN202401',
        role: 'STUDENT',
        scope_type: 'STUDENT',
        student_profile_id: 'prof_stu_1',
      };

      await engine.joinWaitingRoom('cyc_fall_2026', 'prof_stu_1', student1);
      const session = await engine.advancePoolTurn('pool_yr2_general');

      const alloc = await engine.confirmSeat(
        session!.sessionId,
        'st_rm_aryabhata_101_A',
        student1,
        'idemp_key_123'
      );
      expect(alloc.status).toBe('CURRENT');
      expect(alloc.seatId).toBe('st_rm_aryabhata_101_A');

      // Retry with same idempotency key succeeds idempotently
      const retry = await engine.confirmSeat(
        session!.sessionId,
        'st_rm_aryabhata_101_A',
        student1,
        'idemp_key_123'
      );
      expect(retry.allocationId).toBe(alloc.allocationId);
    });

    it('enforces that one seat cannot be taken by two students (conflict rejection)', async () => {
      const student1: AuthActor = {
        id: 'usr_student_1',
        college_id: 'USN202401',
        role: 'STUDENT',
        scope_type: 'STUDENT',
        student_profile_id: 'prof_stu_1',
      };
      const student3: AuthActor = {
        id: 'usr_student_3',
        college_id: 'USN202403',
        role: 'STUDENT',
        scope_type: 'STUDENT',
        student_profile_id: 'prof_stu_3',
      };

      // Student 1 joins, takes seat A
      await engine.joinWaitingRoom('cyc_fall_2026', 'prof_stu_1', student1);
      const sess1 = await engine.advancePoolTurn('pool_yr2_general');
      await engine.confirmSeat(sess1!.sessionId, 'st_rm_aryabhata_101_A', student1);

      // Student 3 joins, receives next turn
      await engine.joinWaitingRoom('cyc_fall_2026', 'prof_stu_3', student3);
      const sess3 = await engine.advancePoolTurn('pool_yr2_general');

      // Student 3 attempts to claim already allocated seat A
      await expect(
        engine.confirmSeat(sess3!.sessionId, 'st_rm_aryabhata_101_A', student3)
      ).rejects.toThrow('SEAT_UNAVAILABLE');
    });
  });

  describe('3. Super Admin Forceful Allocation Override with Mandatory Audit', () => {
    it('requires Super Admin role and reason, writing before/after state to audit trail', async () => {
      const adminActor: AuthActor = {
        id: 'usr_admin',
        college_id: 'ADM001',
        role: 'SUPER_ADMIN',
        scope_type: 'SYSTEM',
      };
      const officeActor: AuthActor = {
        id: 'usr_office',
        college_id: 'OFF001',
        role: 'HOSTEL_OFFICE',
        scope_type: 'SYSTEM',
      };

      // Office role is forbidden from forceful override
      await expect(
        engine.forceOverrideAllocation(
          'cyc_fall_2026',
          'prof_stu_1',
          'st_rm_aryabhata_101_B',
          'Emergency room maintenance shift',
          officeActor
        )
      ).rejects.toThrow('FORBIDDEN');

      // Super Admin with empty reason is rejected
      await expect(
        engine.forceOverrideAllocation(
          'cyc_fall_2026',
          'prof_stu_1',
          'st_rm_aryabhata_101_B',
          '',
          adminActor
        )
      ).rejects.toThrow('REASON_REQUIRED');

      // Super Admin succeeds and records audit log
      const res = await engine.forceOverrideAllocation(
        'cyc_fall_2026',
        'prof_stu_1',
        'st_rm_aryabhata_101_B',
        'Emergency medical accommodation',
        adminActor
      );
      expect(res.allocationId).toBeDefined();

      const auditCheck = await db.query(
        `SELECT * FROM audit_logs WHERE action = 'FORCE_ALLOCATION_OVERRIDE'`
      );
      expect(auditCheck.rows.length).toBe(1);
      expect(auditCheck.rows[0].actor_id).toBe('usr_admin');
      expect(auditCheck.rows[0].reason).toBe('Emergency medical accommodation');
    });
  });

  describe('4. Complaints and Room Change Constraints', () => {
    it('allows students to submit public complaints and vote anonymously once', async () => {
      const student1: AuthActor = {
        id: 'usr_student_1',
        college_id: 'USN202401',
        role: 'STUDENT',
        scope_type: 'STUDENT',
        student_profile_id: 'prof_stu_1',
      };
      const student2: AuthActor = {
        id: 'usr_student_2',
        college_id: 'USN202402',
        role: 'STUDENT',
        scope_type: 'STUDENT',
        student_profile_id: 'prof_stu_2',
      };

      const cmp = await operations.submitComplaint(
        {
          type: 'PUBLIC',
          building_id: 'bld_aryabhata',
          title: 'Water filter maintenance on Floor 1',
          description: 'The RO dispenser needs filter replacement.',
        },
        student1
      );

      // Student 2 votes
      await operations.voteComplaint(cmp.complaintId, student2);

      // Listing public complaints
      const list = await operations.listComplaints(student1);
      expect(list.rows.length).toBeGreaterThan(0);
      const target = list.rows.find((c: any) => c.id === cmp.complaintId);
      expect(target).toBeDefined();
      expect(Number(target.vote_count)).toBe(1);
    });

    it('rejects room change requests when feature flag is disabled', async () => {
      const student1: AuthActor = {
        id: 'usr_student_1',
        college_id: 'USN202401',
        role: 'STUDENT',
        scope_type: 'STUDENT',
        student_profile_id: 'prof_stu_1',
      };

      await expect(
        operations.requestRoomChange(
          'cyc_fall_2026',
          'prof_stu_1',
          'rm_aryabhata_102',
          'Need quiet room for exam prep',
          student1
        )
      ).rejects.toThrow('FEATURE_DISABLED');
    });
  });
});
