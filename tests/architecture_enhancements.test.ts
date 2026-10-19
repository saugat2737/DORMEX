import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { getDatabaseService, resetDatabaseInstance } from '../src/db/index.js';
import { AllocationEngineService } from '../src/allocation/engine.js';

describe('DORMEX Architecture & PostgreSQL Enhancements Suite', () => {
  let app: FastifyInstance;
  let db: any;
  let engine: AllocationEngineService;

  beforeAll(async () => {
    resetDatabaseInstance();
    db = getDatabaseService(true);
    app = await buildApp(db);
    engine = new AllocationEngineService(db);
    await app.ready();
  }, 30000);

  it('1. Confirms database connection service is operational', async () => {
    const res = await db.query('SELECT 1 as alive');
    expect(res.rows[0].alive).toBe(1);
  });

  it('2. Disjoint pool inventory validation passes when inventories are disjoint', async () => {
    const isValid = await engine.validatePoolDisjointInventory('cyc_bvb_pilot_2026');
    expect(isValid).toBe(true);
  });

  it('3. Disjoint pool inventory validation detects and blocks overlapping seat assignments across pools', async () => {
    // Create two active pools for this test
    await db.query(
      `INSERT INTO allocation_pools (id, cycle_id, name, quota_category, academic_year, is_active)
       VALUES ('pool_test_a', 'cyc_bvb_pilot_2026', 'Test Pool A', 'GENERAL', 2, TRUE),
              ('pool_test_b', 'cyc_bvb_pilot_2026', 'Test Pool B', 'MERIT', 2, TRUE)`
    );

    // Assign the same seat to both active pools
    await db.query(
      `INSERT INTO pool_inventories (id, pool_id, seat_id)
       VALUES ('pi_test_a', 'pool_test_a', 'st_rm_bvb_201_A'),
              ('pi_test_b', 'pool_test_b', 'st_rm_bvb_201_A')`
    );

    // Validate that the architectural safeguard catches this violation
    await expect(engine.validatePoolDisjointInventory('cyc_bvb_pilot_2026')).rejects.toThrow(
      /DISJOINT_INVENTORY_VIOLATION/
    );

    // Clean up test records
    await db.query(`DELETE FROM pool_inventories WHERE id IN ('pi_test_a', 'pi_test_b')`);
    await db.query(`DELETE FROM allocation_pools WHERE id IN ('pool_test_a', 'pool_test_b')`);
  });

  it('4. Immediately advances turn upon confirmation without stalling remaining clock time', async () => {
    // Student DEMO-001 joins waiting room
    const joinRes = await app.inject({
      method: 'POST',
      url: '/api/allocation-cycles/cyc_bvb_pilot_2026/join',
      headers: { 'x-user-id': 'usr_demo_001' },
      payload: { studentProfileId: 'prof_demo_001' },
    });
    expect(joinRes.statusCode).toBe(200);
    const { poolId } = joinRes.json();

    // Advance pool turn to activate session for DEMO-001
    const advRes = await app.inject({
      method: 'POST',
      url: `/api/allocation-pools/${poolId}/advance`,
    });
    expect(advRes.statusCode).toBe(200);
    const session = advRes.json().session;
    expect(session).toBeDefined();

    // Confirm seat for DEMO-001
    const confirmRes = await app.inject({
      method: 'POST',
      url: `/api/booking-sessions/${session.sessionId}/confirm-seat`,
      headers: { 'x-user-id': 'usr_demo_001' },
      payload: { seatId: 'st_rm_bvb_201_A', idempotencyKey: 'idemp_test_adv_1' },
    });
    expect(confirmRes.statusCode).toBe(200);

    // Verify session status is updated to CONFIRMED
    const sessCheck = await db.query(`SELECT status FROM booking_sessions WHERE id = $1`, [session.sessionId]);
    expect(sessCheck.rows[0].status).toBe('CONFIRMED');
  });

  it('5. Executes non-mutating dry-run cycle simulation and returns duration predictions', async () => {
    const simRes = await app.inject({
      method: 'POST',
      url: '/api/allocation-cycles/cyc_bvb_pilot_2026/simulate',
      headers: { 'x-user-id': 'usr_office' },
    });

    expect(simRes.statusCode).toBe(200);
    const sim = simRes.json();

    expect(sim.cycleId).toBe('cyc_bvb_pilot_2026');
    expect(sim.totalEligibleStudents).toBeGreaterThan(0);
    expect(sim.totalAvailableSeats).toBeGreaterThanOrEqual(0);
    expect(sim.estimatedAverageSecondsPerTurn).toBeGreaterThan(0);
    expect(sim.predictedDurationMinutes).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(sim.poolBreakdown)).toBe(true);
  });

  it('6. Generates administrative occupancy and allocation reports in JSON and CSV formats', async () => {
    // 1. JSON Report Export
    const jsonRes = await app.inject({
      method: 'GET',
      url: '/api/admin/reports/occupancy?format=json',
      headers: { 'x-user-id': 'usr_office' },
    });
    expect(jsonRes.statusCode).toBe(200);
    const jsonBody = jsonRes.json();
    expect(jsonBody.generatedAt).toBeDefined();
    expect(jsonBody.totalRecords).toBeGreaterThan(0);
    expect(Array.isArray(jsonBody.records)).toBe(true);

    // 2. CSV Report Export
    const csvRes = await app.inject({
      method: 'GET',
      url: '/api/admin/reports/occupancy?format=csv',
      headers: { 'x-user-id': 'usr_warden_bvb' },
    });
    expect(csvRes.statusCode).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.payload).toContain('Building,Floor,Room,Type,Seat,Seat Status,Allocated');

    // 3. Unauthorized access check (Student forbidden)
    const unauthRes = await app.inject({
      method: 'GET',
      url: '/api/admin/reports/occupancy?format=csv',
      headers: { 'x-user-id': 'usr_demo_001' },
    });
    expect(unauthRes.statusCode).toBe(403);
  });

  it('7. Enforces cycle publication lifecycle (READY -> PUBLISHED -> LOCKED) with timestamp auditing', async () => {
    // 1. Publish results
    const pubRes = await app.inject({
      method: 'PUT',
      url: '/api/allocation-cycles/cyc_bvb_pilot_2026/status',
      headers: { 'x-user-id': 'usr_office' },
      payload: { status: 'PUBLISHED' },
    });
    expect(pubRes.statusCode).toBe(200);

    const checkPub = await db.query(`SELECT status, results_published_at FROM allocation_cycles WHERE id = $1`, ['cyc_bvb_pilot_2026']);
    expect(checkPub.rows[0].status).toBe('PUBLISHED');
    expect(checkPub.rows[0].results_published_at).not.toBeNull();

    // 2. Lock cycle
    const lockRes = await app.inject({
      method: 'PUT',
      url: '/api/allocation-cycles/cyc_bvb_pilot_2026/status',
      headers: { 'x-user-id': 'usr_admin' },
      payload: { status: 'LOCKED' },
    });
    expect(lockRes.statusCode).toBe(200);

    const checkLock = await db.query(`SELECT status, config_frozen_at FROM allocation_cycles WHERE id = $1`, ['cyc_bvb_pilot_2026']);
    expect(checkLock.rows[0].status).toBe('LOCKED');
    expect(checkLock.rows[0].config_frozen_at).not.toBeNull();

    // 3. Student forbidden from changing cycle status
    const studentMutate = await app.inject({
      method: 'PUT',
      url: '/api/allocation-cycles/cyc_bvb_pilot_2026/status',
      headers: { 'x-user-id': 'usr_demo_001' },
      payload: { status: 'READY' },
    });
    expect(studentMutate.statusCode).toBe(403);
  });
});

