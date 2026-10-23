import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import { getDatabaseService, resetDatabaseInstance } from '../src/db/index.js';

describe('Regression & QA Workflow Suite (Admin Override, Occupancy Export, Role Scopes)', () => {
  let app: any;
  let db: any;

  beforeAll(async () => {
    resetDatabaseInstance();
    db = getDatabaseService(true);
    const fastifyApp = await buildApp(db);
    await fastifyApp.ready();
    app = fastifyApp.server;
  }, 30000);

  it('Regression: Super Admin force-override route matches frontend contract and relocates student with audit log', async () => {
    // Attempt force-override as Super Admin (usr_admin)
    const res = await request(app)
      .post('/api/admin/allocations/force-override')
      .set('x-user-id', 'usr_admin')
      .send({
        cycleId: 'cyc_fall_2026',
        studentId: 'prof_stu_1',
        seatId: 'st_rm_aryabhata_101_B',
        reason: 'Dual-Warden Override: Medical and accessibility request',
      });

    expect(res.status).toBe(200);
    expect(res.body.allocationId).toBeDefined();

    // Verify student is now assigned to st_rm_aryabhata_101_B
    const allocCheck = await db.query(
      `SELECT * FROM allocations WHERE cycle_id = 'cyc_fall_2026' AND student_id = 'prof_stu_1' AND status = 'CURRENT'`
    );
    expect(allocCheck.rows.length).toBe(1);
    expect(allocCheck.rows[0].seat_id).toBe('st_rm_aryabhata_101_B');

    // Verify audit log entry was created
    const auditCheck = await db.query(
      `SELECT * FROM audit_logs WHERE target_id = $1 AND action = 'FORCE_ALLOCATION_OVERRIDE'`,
      [res.body.allocationId]
    );
    expect(auditCheck.rows.length).toBe(1);
    expect(auditCheck.rows[0].reason).toContain('Dual-Warden Override');
  });

  it('Regression: Non-Super Admin cannot perform force allocation override', async () => {
    const res = await request(app)
      .post('/api/admin/allocations/force-override')
      .set('x-user-id', 'usr_student_1')
      .send({
        cycleId: 'cyc_fall_2026',
        studentId: 'prof_stu_1',
        seatId: 'st_rm_aryabhata_101_B',
        reason: 'Unauthorized student override attempt',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('FORBIDDEN');
  });

  it('Regression: Admin occupancy report export correctly serializes seat labels without undefined in CSV', async () => {
    const res = await request(app)
      .get('/api/admin/reports/occupancy?format=csv')
      .set('x-user-id', 'usr_admin');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const csvContent = res.text;
    expect(csvContent).toContain('Building,Floor,Room,Type,Seat,Seat Status,Allocated,Student USN,Student Name,Branch,Quota,Confirmed At');
    // Ensure "undefined" does not appear as a column value for seat_number
    expect(csvContent).not.toContain('"undefined"');
    // Ensure actual seat labels like "A" or "B" appear in quotes
    expect(csvContent).toMatch(/"A"|"B"/);
  });

  it('Regression: Unauthorized roles cannot download administrative occupancy reports', async () => {
    const res = await request(app)
      .get('/api/admin/reports/occupancy?format=csv')
      .set('x-user-id', 'usr_student_1');

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('FORBIDDEN');
  });
});
