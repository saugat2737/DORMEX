import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { DatabaseService, getDatabaseService } from './db/index.js';
import { runMigrations } from './db/schema.js';
import { seedDatabase } from './db/seed.js';
import { AllocationEngineService } from './allocation/engine.js';
import { FloorPlanService } from './inventory/floorPlan.js';
import { StudentRegistryService } from './student/registry.js';
import { PreferencesService } from './preferences/service.js';
import { OperationsService } from './operations/service.js';
import { NotificationService } from './notifications/service.js';
import { StudentAdmissionService } from './student/admissionService.js';
import { MessMenuService } from './operations/messMenuService.js';
import { AuthActor } from './auth/policy.js';

export async function buildApp(db?: DatabaseService): Promise<FastifyInstance> {
  const app = Fastify({ 
    logger: false,
    bodyLimit: 15 * 1024 * 1024, // 15MB to comfortably accommodate high-res weekly mess menu images
  });
  const database = db || getDatabaseService();

  // Initialize DB schema & seed
  await runMigrations(database);
  await seedDatabase(database);

  await app.register(cors, { origin: true });
  await app.register(cookie);

  const clientDist = path.join(process.cwd(), 'dist', 'client');
  const publicDir = path.join(process.cwd(), 'public');

  if (fs.existsSync(publicDir)) {
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: '/public/',
      decorateReply: false,
    });
  }

  if (fs.existsSync(clientDist)) {
    await app.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
    });

    app.setNotFoundHandler(async (req, reply) => {
      if (req.url.startsWith('/api')) {
        return reply.code(404).send({ error: 'Endpoint not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  const allocationEngine = new AllocationEngineService(database);
  const floorPlanService = new FloorPlanService(database);
  const studentRegistry = new StudentRegistryService(database);
  const preferencesService = new PreferencesService(database);
  const operationsService = new OperationsService(database);
  const notificationService = new NotificationService(database);
  const admissionService = new StudentAdmissionService(database);
  const messMenuService = new MessMenuService(database);

  // Helper auth extractor (supports dev token/header for seamless verification)
  const extractActor = async (req: any): Promise<AuthActor> => {
    const userId = req.headers['x-user-id'] || 'usr_student_1';
    const userRes = await database.query(
      `SELECT u.id, u.college_id, r.name as role_name, ur.scope_type, ur.scope_id, sp.id as profile_id
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw new Error('UNAUTHORIZED: Invalid credentials');
    }

    const row = userRes.rows[0];
    return {
      id: row.id,
      college_id: row.college_id,
      role: row.role_name,
      scope_type: row.scope_type,
      scope_id: row.scope_id,
      student_profile_id: row.profile_id,
    };
  };

  // Health check
  app.get('/health', async () => ({ status: 'UP', service: 'DORMEX Hostel Allocation Engine' }));

  // Student Registry routes
  app.get('/api/students', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const query = req.query || {};
      const students = await studentRegistry.listStudents(actor, {
        academicYear: query.academicYear ? parseInt(query.academicYear, 10) : undefined,
        quota: query.quota,
        search: query.search,
      });
      return reply.send(students);
    } catch (err: any) {
      return reply.code(err.message?.startsWith('FORBIDDEN') ? 403 : 400).send({ error: err.message });
    }
  });

  app.post('/api/students', async (req, reply) => {
    try {
      const actor = await extractActor(req);
      const result = await studentRegistry.registerStudent(req.body as any, actor);
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(err.message?.startsWith('FORBIDDEN') ? 403 : 400).send({ error: err.message });
    }
  });

  app.get('/api/students/:id', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const profile = await studentRegistry.getProfile(req.params.id, actor);
      return reply.send(profile);
    } catch (err: any) {
      return reply.code(err.message?.startsWith('FORBIDDEN') ? 403 : 404).send({ error: err.message });
    }
  });

  app.put('/api/students/:id/eligibility', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { status } = req.body as any;
      await studentRegistry.updateEligibility(req.params.id, status, actor);
      return reply.send({ success: true, message: 'Student eligibility updated successfully' });
    } catch (err: any) {
      return reply.code(err.message?.startsWith('FORBIDDEN') ? 403 : 400).send({ error: err.message });
    }
  });

  app.put('/api/students/:id/priority', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { priority } = req.body as any;
      await studentRegistry.updatePriority(req.params.id, priority, actor);
      return reply.send({ success: true, message: 'Student priority updated successfully' });
    } catch (err: any) {
      return reply.code(err.message?.startsWith('FORBIDDEN') ? 403 : 400).send({ error: err.message });
    }
  });

  // Buildings & Floors Inventory
  app.get('/api/buildings', async () => {
    const res = await database.query(`SELECT * FROM buildings WHERE is_active = TRUE ORDER BY code ASC`);
    return res.rows;
  });

  app.get('/api/buildings/:id/floors', async (req: any) => {
    const res = await database.query(
      `SELECT * FROM floors WHERE building_id = $1 ORDER BY floor_number ASC`,
      [req.params.id]
    );
    return res.rows;
  });

  app.get('/api/allocation-cycles', async () => {
    const res = await database.query(`SELECT * FROM allocation_cycles ORDER BY created_at DESC`);
    return res.rows;
  });

  app.get('/api/admin/overview', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      if (['STUDENT', 'PROCTOR'].includes(actor.role)) {
        return reply.code(403).send({ error: 'FORBIDDEN: Insufficient permissions' });
      }

      const totalSeatsRes = await database.query(`SELECT COUNT(*) as count FROM seats`);
      const occupiedSeatsRes = await database.query(`SELECT COUNT(*) as count FROM allocations WHERE status = 'CURRENT'`);
      const studentsRes = await database.query(`SELECT COUNT(*) as count FROM student_profiles`);
      const complaintsRes = await database.query(`SELECT COUNT(*) as count FROM complaints WHERE status = 'OPEN'`);
      const buildingsRes = await database.query(`SELECT COUNT(*) as count FROM buildings`);

      const activeSeatsRes = await database.query(`SELECT COUNT(*) as count FROM seats WHERE status = 'ACTIVE'`);
      const activeCount = parseInt(activeSeatsRes.rows[0].count, 10);
      const occupiedCount = parseInt(occupiedSeatsRes.rows[0].count, 10);
      const availableCount = Math.max(0, activeCount - occupiedCount);

      const blockedSeatsRes = await database.query(`SELECT COUNT(*) as count FROM seats WHERE status = 'BLOCKED'`);
      const maintenanceSeatsRes = await database.query(`SELECT COUNT(*) as count FROM seats WHERE status = 'MAINTENANCE'`);
      const totalRoomsRes = await database.query(`SELECT COUNT(*) as count FROM rooms`);
      const eligibleStudentsRes = await database.query(`SELECT COUNT(*) as count FROM student_profiles WHERE eligibility_status = 'ELIGIBLE'`);

      return {
        totalSeats: parseInt(totalSeatsRes.rows[0].count, 10),
        occupiedSeats: occupiedCount,
        availableSeats: availableCount,
        blockedSeats: parseInt(blockedSeatsRes.rows[0].count, 10),
        maintenanceSeats: parseInt(maintenanceSeatsRes.rows[0].count, 10),
        totalRooms: parseInt(totalRoomsRes.rows[0].count, 10),
        registeredStudents: parseInt(studentsRes.rows[0].count, 10),
        eligibleStudents: parseInt(eligibleStudentsRes.rows[0].count, 10),
        openComplaints: parseInt(complaintsRes.rows[0].count, 10),
        totalBuildings: parseInt(buildingsRes.rows[0].count, 10),
      };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Administrative Occupancy and Allocation Reports Export Endpoint
  app.get('/api/admin/reports/occupancy', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      if (!['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_OFFICE', 'SUPER_ADMIN'].includes(actor.role)) {
        return reply.code(403).send({ error: 'FORBIDDEN: Insufficient permissions to generate occupancy reports' });
      }

      const format = req.query?.format || 'json';
      const buildingId = req.query?.buildingId;

      let query = `
        SELECT 
          b.name as building_name,
          f.floor_number,
          r.room_number,
          r.room_type,
          s.seat_label,
          s.status as seat_status,
          a.status as allocation_status,
          sp.college_id as student_usn,
          sp.full_name as student_name,
          sp.department as branch,
          sp.quota_category,
          a.allocated_at as confirmed_at
        FROM seats s
        JOIN rooms r ON s.room_id = r.id
        JOIN floors f ON r.floor_id = f.id
        JOIN buildings b ON f.building_id = b.id
        LEFT JOIN allocations a ON s.id = a.seat_id AND a.status = 'CURRENT'
        LEFT JOIN student_profiles sp ON a.student_id = sp.id
      `;
      const params: any[] = [];
      if (buildingId) {
        query += ` WHERE b.id = $1`;
        params.push(buildingId);
      }
      query += ` ORDER BY b.name ASC, f.floor_number ASC, r.room_number ASC, s.seat_label ASC`;

      const res = await database.query(query, params);

      if (format === 'csv') {
        const header = ['Building', 'Floor', 'Room', 'Type', 'Seat', 'Seat Status', 'Allocated', 'Student USN', 'Student Name', 'Branch', 'Quota', 'Confirmed At'];
        const rows = res.rows.map((row: any) => [
          `"${row.building_name}"`,
          row.floor_number,
          `"${row.room_number}"`,
          `"${row.room_type || 'STANDARD'}"`,
          `"${row.seat_number}"`,
          `"${row.seat_status}"`,
          row.allocation_status ? '"YES"' : '"NO"',
          `"${row.student_usn || ''}"`,
          `"${row.student_name || ''}"`,
          `"${row.branch || ''}"`,
          `"${row.quota_category || ''}"`,
          `"${row.confirmed_at ? new Date(row.confirmed_at).toISOString() : ''}"`
        ]);
        const csvContent = [header.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="dormex_occupancy_report.csv"');
        return reply.send(csvContent);
      }

      return reply.send({
        generatedAt: new Date().toISOString(),
        totalRecords: res.rows.length,
        records: res.rows
      });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Admin rooms inventory endpoint with status updates
  app.get('/api/floors/:id/rooms', async (req: any, reply) => {
    try {
      const res = await database.query(
        `SELECT r.*, 
                COUNT(s.id) as total_seats,
                COUNT(CASE WHEN s.status = 'ACTIVE' AND a.id IS NULL THEN 1 END) as available_seats,
                COUNT(CASE WHEN a.id IS NOT NULL THEN 1 END) as occupied_seats
         FROM rooms r
         LEFT JOIN seats s ON r.id = s.room_id
         LEFT JOIN allocations a ON s.id = a.seat_id AND a.status = 'CURRENT'
         WHERE r.floor_id = $1
         GROUP BY r.id
         ORDER BY r.room_number ASC`,
        [req.params.id]
      );
      return reply.send(res.rows);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Admin seat status toggle (maintenance, blocked, active)
  app.put('/api/seats/:id/status', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      if (!['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_OFFICE', 'SUPER_ADMIN'].includes(actor.role)) {
        return reply.code(403).send({ error: 'FORBIDDEN: Insufficient permissions to update seat status' });
      }
      const { status } = req.body as any;
      if (!['ACTIVE', 'BLOCKED', 'MAINTENANCE'].includes(status)) {
        return reply.code(400).send({ error: 'INVALID_STATUS: Must be ACTIVE, BLOCKED, or MAINTENANCE' });
      }

      await database.query(
        `UPDATE seats SET status = $1 WHERE id = $2`,
        [status, req.params.id]
      );
      return reply.send({ success: true, seatId: req.params.id, status });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Admin cycle status toggle (e.g. manual early start for pilot)
  app.put('/api/allocation-cycles/:id/status', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      if (!['HOSTEL_OFFICE', 'SUPER_ADMIN'].includes(actor.role)) {
        return reply.code(403).send({ error: 'FORBIDDEN: Only Hostel Office or Super Admin can manage allocation cycle status' });
      }
      const { status, waitingRoomThreshold } = req.body as any;
      if (status) {
        if (['READY', 'SIMULATING'].includes(status)) {
          // Architectural guarantee: Validate disjoint seat inventories across active pools
          await allocationEngine.validatePoolDisjointInventory(req.params.id);
        }
        if (status === 'PUBLISHED') {
          await database.query(`UPDATE allocation_cycles SET status = $1, results_published_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, req.params.id]);
          await notificationService.createNotification({
            category: 'ALLOTMENT',
            priority: 'HIGH',
            title: 'Official Allocation Results Certified & Published',
            message: `Official allocation results are now live for cycle ${req.params.id}. You can inspect final room allocations and submit 48-hour room change requests.`,
            target_audience: 'ALL',
            reference_id: req.params.id,
            reference_type: 'ALLOCATION_CYCLE',
            author_name: 'Hostel Office',
          });
        } else if (status === 'LOCKED') {
          await database.query(`UPDATE allocation_cycles SET status = $1, config_frozen_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, req.params.id]);
          await notificationService.createNotification({
            category: 'ALLOTMENT',
            priority: 'NORMAL',
            title: 'Allocation Cycle Archived & Locked',
            message: `Allocation cycle ${req.params.id} has been formally locked. Final seat configurations are permanent.`,
            target_audience: 'ALL',
            reference_id: req.params.id,
            reference_type: 'ALLOCATION_CYCLE',
            author_name: 'System Administration',
          });
        } else {
          await database.query(`UPDATE allocation_cycles SET status = $1 WHERE id = $2`, [status, req.params.id]);
        }
      }
      if (waitingRoomThreshold !== undefined) {
        await database.query(`UPDATE allocation_cycles SET waiting_room_threshold = $1 WHERE id = $2`, [waitingRoomThreshold, req.params.id]);
      }
      return reply.send({ success: true, message: `Cycle updated to ${status} successfully` });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Cycle Simulation / Dry-Run Prediction
  app.post('/api/allocation-cycles/:id/simulate', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const simulation = await allocationEngine.simulateCycle(req.params.id, actor);
      return reply.send(simulation);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  // Inventory & Floor Plan routes
  app.post('/api/floors/:id/draft', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { geometry } = req.body as any;
      const result = await floorPlanService.saveDraft(req.params.id, geometry, actor);
      return reply.code(201).send(result);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.post('/api/floors/:id/publish', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { version } = req.body as any;
      await floorPlanService.publishMap(req.params.id, version, actor);
      return reply.send({ success: true, message: 'Floor map published successfully' });
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.get('/api/floors/:id/map', async (req: any, reply) => {
    const map = await floorPlanService.getPublishedMap(req.params.id);
    if (!map) {
      return reply.code(404).send({ error: 'Published floor map not found' });
    }
    return reply.send(map);
  });

  app.get('/api/floors/:id/state', async (req: any) => {
    const allocRes = await database.query(
      `SELECT s.id as seat_id, a.id as alloc_id
       FROM seats s
       JOIN rooms r ON s.room_id = r.id
       LEFT JOIN allocations a ON s.id = a.seat_id AND a.status = 'CURRENT'
       WHERE r.floor_id = $1`,
      [req.params.id]
    );

    const seatStatus: Record<string, string> = {};
    for (const row of allocRes.rows) {
      seatStatus[row.seat_id] = row.alloc_id ? 'taken' : 'free';
    }
    return seatStatus;
  });

  app.get('/api/floors/:id/svg', async (req: any, reply) => {
    const map = await floorPlanService.getPublishedMap(req.params.id);
    if (!map) {
      return reply.code(404).send({ error: 'Published floor map not found' });
    }
    // Fetch seat allocations for the floor to colorize seats
    const allocRes = await database.query(
      `SELECT s.id as seat_id, a.id as alloc_id
       FROM seats s
       JOIN rooms r ON s.room_id = r.id
       LEFT JOIN allocations a ON s.id = a.seat_id AND a.status = 'CURRENT'
       WHERE r.floor_id = $1`,
      [req.params.id]
    );

    const seatStatus: Record<string, string> = {};
    for (const row of allocRes.rows) {
      seatStatus[row.seat_id] = row.alloc_id ? 'taken' : 'free';
    }

    const svg = floorPlanService.renderFloorSvg(map, seatStatus);
    return reply.type('image/svg+xml').send(svg);
  });

  // Allocation Cycle routes
  app.post('/api/allocation-cycles/:id/join', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { studentProfileId } = req.body as any;
      const res = await allocationEngine.joinWaitingRoom(req.params.id, studentProfileId, actor);
      return reply.send(res);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.post('/api/allocation-pools/:id/advance', async (req: any, reply) => {
    try {
      const session = await allocationEngine.advancePoolTurn(req.params.id);
      return reply.send({ session });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.post('/api/booking-sessions/:id/confirm-seat', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { seatId, idempotencyKey } = req.body as any;
      const result = await allocationEngine.confirmSeat(req.params.id, seatId, actor, idempotencyKey);
      
      // Architectural optimization: Advance turn immediately on confirm
      // To prevent waiting out the wall clock when the current student completes early
      const sessRes = await database.query('SELECT pool_id FROM booking_sessions WHERE id = $1', [req.params.id]);
      if (sessRes.rows.length > 0 && sessRes.rows[0].pool_id) {
        // Asynchronously advance to the next waiting student without blocking the confirmation response
        allocationEngine.advancePoolTurn(sessRes.rows[0].pool_id).catch(() => {});
      }

      return reply.send(result);
    } catch (err: any) {
      const msg = err.message || '';
      let code = 400;
      if (msg.startsWith('FORBIDDEN') || msg.startsWith('NOT_YOUR_TURN')) code = 403;
      if (msg.startsWith('SEAT_UNAVAILABLE')) code = 409;
      return reply.code(code).send({ error: msg });
    }
  });

  // Administrative Audit Trail Endpoint
  app.get('/api/admin/audit-logs', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      if (!['HOSTEL_OFFICE', 'SUPER_ADMIN'].includes(actor.role)) {
        return reply.code(403).send({ error: 'FORBIDDEN: Insufficient permissions to inspect administrative audit logs' });
      }
      const res = await database.query(
        `SELECT a.*, u.full_name as actor_name, u.email as actor_email
         FROM audit_logs a
         LEFT JOIN users u ON a.actor_id = u.id
         ORDER BY a.created_at DESC
         LIMIT 50`
      );
      return reply.send(res.rows);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Super Admin Force Override route
  app.post('/api/admin/allocations/force-override', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { cycleId, studentId, seatId, reason } = req.body as any;
      const result = await allocationEngine.forceOverrideAllocation(cycleId, studentId, seatId, reason, actor);
      return reply.send(result);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  // Wishlist & Invites
  app.post('/api/seats/:id/wishlist', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { cycleId, studentProfileId } = req.body as any;
      await preferencesService.addWishlist(cycleId, studentProfileId, req.params.id, actor);
      return reply.send({ success: true });
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.post('/api/invites', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { cycleId, seatId, fromStudentId } = req.body as any;
      const result = await preferencesService.createInvite(cycleId, fromStudentId, seatId, actor);
      return reply.code(201).send(result);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  // Operations: Complaints & Room Changes
  app.post('/api/complaints', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const result = await operationsService.submitComplaint(req.body as any, actor);
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.get('/api/complaints', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const res = await operationsService.listComplaints(actor, req.query?.buildingId);
      return reply.send(res.rows);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.put('/api/complaints/:id', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      await operationsService.updateComplaint(req.params.id, req.body as any, actor);
      return reply.send({ success: true, message: 'Complaint updated' });
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.post('/api/complaints/:id/vote', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      await operationsService.voteComplaint(req.params.id, actor);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.post('/api/room-change-requests', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { cycleId, studentProfileId, targetRoomId, reason } = req.body as any;
      const res = await operationsService.requestRoomChange(cycleId, studentProfileId, targetRoomId, reason, actor);
      return reply.code(201).send(res);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.get('/api/room-change-requests', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const requests = await operationsService.listRoomChangeRequests(actor, req.query?.cycleId);
      return reply.send(requests);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.put('/api/room-change-requests/:id/review', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { decision, notes, targetSeatId } = req.body as any;
      await operationsService.reviewRoomChange(req.params.id, decision, notes, actor, targetSeatId);
      return reply.send({ success: true, message: `Room change request ${decision.toLowerCase()} successfully` });
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.post('/api/room-change-requests/in-person', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { cycleId, studentProfileId, targetRoomId, reason, autoApprove } = req.body as any;
      const res = await operationsService.recordInPersonRoomChange(cycleId, studentProfileId, targetRoomId, reason, actor, autoApprove);
      return reply.code(201).send(res);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  // Terms and Conditions Endpoints
  app.get('/api/terms/latest', async () => {
    return studentRegistry.getLatestTerms();
  });

  app.get('/api/students/:id/terms-status', async (req: any, reply) => {
    try {
      const status = await studentRegistry.getStudentTermsStatus(req.params.id);
      return reply.send(status);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.post('/api/students/:id/accept-terms', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { termsVersion } = req.body as any;
      await studentRegistry.acceptTerms(req.params.id, termsVersion, actor, req.ip);
      return reply.send({ success: true, message: 'Hostel Responsibility terms accepted successfully' });
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  // Student Onboarding Profile Endpoints
  app.put('/api/students/:id/profile', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      await studentRegistry.updateStudentProfile(req.params.id, req.body as any, actor);
      return reply.send({ success: true, message: 'Profile updated successfully' });
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.post('/api/students/:id/submit-profile', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      await studentRegistry.submitStudentProfile(req.params.id, actor);
      return reply.send({ success: true, message: 'Profile submitted for Hostel Office review' });
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  // Fee Verification & Priority Recalculation Endpoints (Hostel Office)
  app.put('/api/students/:id/verify-fee', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      await studentRegistry.verifyFeePayment(req.params.id, req.body as any, actor);
      return reply.send({ success: true, message: 'Fee payment verified successfully' });
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.post('/api/students/recalculate-priorities', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { academicYear, quotaCategory } = req.body as any;
      const res = await studentRegistry.recalculatePrioritiesByPayment(academicYear || 2, quotaCategory || 'GENERAL', actor);
      return reply.send({ success: true, updatedCount: res.updatedCount });
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  // Roommate Group Coordination Endpoints
  app.post('/api/roommate-groups', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { cycleId, leaderStudentId, roomId, peerPriorityNumbers } = req.body as any;
      const res = await preferencesService.createRoommateGroup(cycleId, leaderStudentId, roomId, peerPriorityNumbers, actor);
      return reply.code(201).send(res);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.post('/api/roommate-groups/:id/respond', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { studentProfileId, accept } = req.body as any;
      const res = await preferencesService.respondToRoommateInvite(req.params.id, studentProfileId, accept, actor);
      return reply.send(res);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.get('/api/roommate-groups/student/:id', async (req: any, reply) => {
    try {
      const cycleId = req.query?.cycleId || 'cyc_bvb_pilot_2026';
      const groups = await preferencesService.getStudentRoommateGroups(req.params.id, cycleId);
      return reply.send(groups);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.get('/api/floors/:id/roommate-intent', async (req: any, reply) => {
    try {
      const cycleId = req.query?.cycleId || 'cyc_bvb_pilot_2026';
      const map = await preferencesService.getRoommateIntentSeats(req.params.id, cycleId);
      return reply.send(map);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Notifications & Announcements Endpoints
  app.get('/api/notifications', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const res = await notificationService.listNotifications(actor);
      return reply.send(res);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.post('/api/notifications/mark-read', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { id, all } = (req.body as any) || {};
      if (all) {
        await notificationService.markAllAsRead(actor);
      } else if (id) {
        await notificationService.markAsRead(id, actor);
      }
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.post('/api/admin/notices', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const notice = await notificationService.publishNotice(req.body as any, actor);
      return reply.code(201).send(notice);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  // Student Admission Management Endpoints (Hostel Office Workspace)
  app.post('/api/admissions', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const result = await admissionService.createAdmission(req.body as any, actor);
      return reply.code(201).send(result);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.get('/api/admissions', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const list = await admissionService.listAdmissions(actor, req.query as any);
      return reply.send(list);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.get('/api/admissions/proctors', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const proctors = await admissionService.listProctors(actor);
      return reply.send(proctors);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.get('/api/admissions/:id', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const admission = await admissionService.getAdmission(req.params.id, actor);
      return reply.send(admission);
    } catch (err: any) {
      const code = err.message?.startsWith('FORBIDDEN') ? 403 : err.message?.startsWith('NOT_FOUND') ? 404 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.put('/api/admissions/:id', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const updated = await admissionService.updateAdmission(req.params.id, req.body as any, actor);
      return reply.send(updated);
    } catch (err: any) {
      const code = err.message?.startsWith('FORBIDDEN') ? 403 : err.message?.startsWith('NOT_FOUND') ? 404 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  // Weekly Mess Menu Management Endpoints
  app.post('/api/mess/menus', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      let payload = req.body;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          return reply.code(400).send({ error: 'VALIDATION_ERROR: Invalid JSON request body' });
        }
      }
      const menu = await messMenuService.uploadMenu((payload || {}) as any, actor);
      return reply.code(201).send(menu);
    } catch (err: any) {
            const code = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.put('/api/mess/menus/:id/status', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const { status } = req.body as any;
      const updated = await messMenuService.updateMenuStatus(req.params.id, status, actor);
      return reply.send(updated);
    } catch (err: any) {
      const code = err.message?.startsWith('FORBIDDEN') ? 403 : err.message?.startsWith('NOT_FOUND') ? 404 : 400;
      return reply.code(code).send({ error: err.message });
    }
  });

  app.get('/api/mess/menu/active', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const scope = (req.query?.scope as string) || 'CAMPUS_CENTRAL';
      const menu = await messMenuService.getActiveMenu(scope, actor);
      return reply.send(menu);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.get('/api/mess/menus', async (req: any, reply) => {
    try {
      const actor = await extractActor(req);
      const scope = (req.query?.scope as string) || 'CAMPUS_CENTRAL';
      const menus = await messMenuService.listMenus(actor, scope);
      return reply.send(menus);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  return app;
}
