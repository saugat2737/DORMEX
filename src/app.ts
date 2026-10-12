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
import { AuthActor } from './auth/policy.js';

export async function buildApp(db?: DatabaseService): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const database = db || getDatabaseService();

  // Initialize DB schema & seed
  await runMigrations(database);
  await seedDatabase(database);

  await app.register(cors, { origin: true });
  await app.register(cookie);

  const clientDist = path.join(process.cwd(), 'dist', 'client');
  if (fs.existsSync(clientDist)) {
    await app.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
    });
  }

  const allocationEngine = new AllocationEngineService(database);
  const floorPlanService = new FloorPlanService(database);
  const studentRegistry = new StudentRegistryService(database);
  const preferencesService = new PreferencesService(database);
  const operationsService = new OperationsService(database);

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

      return {
        totalSeats: parseInt(totalSeatsRes.rows[0].count, 10),
        occupiedSeats: parseInt(occupiedSeatsRes.rows[0].count, 10),
        registeredStudents: parseInt(studentsRes.rows[0].count, 10),
        openComplaints: parseInt(complaintsRes.rows[0].count, 10),
        totalBuildings: parseInt(buildingsRes.rows[0].count, 10),
      };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
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
      return reply.send(result);
    } catch (err: any) {
      const msg = err.message || '';
      let code = 400;
      if (msg.startsWith('FORBIDDEN') || msg.startsWith('NOT_YOUR_TURN')) code = 403;
      if (msg.startsWith('SEAT_UNAVAILABLE')) code = 409;
      return reply.code(code).send({ error: msg });
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

  return app;
}
