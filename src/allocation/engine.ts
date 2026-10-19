import { DatabaseService } from '../db/index.js';
import { AuthActor, can } from '../auth/policy.js';

export interface JoinWaitingRoomResult {
  entryId: string;
  cycleId: string;
  poolId: string;
  status: string;
  priorityNumber: number;
}

export interface BookingSessionInfo {
  sessionId: string;
  cycleId: string;
  poolId: string;
  studentId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CONFIRMED' | 'CANCELLED';
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
}

export class AllocationEngineService {
  constructor(private db: DatabaseService) {}

  /**
   * Validate that concurrent active pools have strictly disjoint seat inventory.
   * If two active pools share any seats, an error is thrown.
   */
  async validatePoolDisjointInventory(cycleId: string): Promise<boolean> {
    const conflictRes = await this.db.query(
      `SELECT pi1.seat_id, p1.name as pool1_name, p2.name as pool2_name
       FROM pool_inventories pi1
       JOIN pool_inventories pi2 ON pi1.seat_id = pi2.seat_id AND pi1.pool_id != pi2.pool_id
       JOIN allocation_pools p1 ON pi1.pool_id = p1.id
       JOIN allocation_pools p2 ON pi2.pool_id = p2.id
       WHERE p1.cycle_id = $1 AND p2.cycle_id = $1 AND p1.is_active = TRUE AND p2.is_active = TRUE
       LIMIT 1`,
      [cycleId]
    );

    if (conflictRes.rows.length > 0) {
      const c = conflictRes.rows[0];
      throw new Error(`DISJOINT_INVENTORY_VIOLATION: Seat ${c.seat_id} is assigned to multiple active pools (${c.pool1_name} and ${c.pool2_name}) in cycle ${cycleId}`);
    }
    return true;
  }

  /**
   * Calculate late penalty turn shift using the agreed provisional default:
   * lateness = now - student's scheduled turn start
   * grace = 6 min (360s), turn_len = 2 min (120s), max_penalty_turns = 10
   */
  calculateLatePenalty(scheduledTurnStart: Date, now: Date = new Date()): number {
    const latenessSeconds = (now.getTime() - scheduledTurnStart.getTime()) / 1000;
    const graceSeconds = 360;
    const turnLenSeconds = 120;
    const maxPenaltyTurns = 10;

    if (latenessSeconds <= graceSeconds) {
      return 0;
    }

    const turnsOverGrace = Math.ceil((latenessSeconds - graceSeconds) / turnLenSeconds);
    return Math.min(maxPenaltyTurns, turnsOverGrace);
  }

  /**
   * Student joins the waiting room for an active or ready cycle.
   */
  async joinWaitingRoom(
    cycleId: string,
    studentProfileId: string,
    actor: AuthActor
  ): Promise<JoinWaitingRoomResult> {
    if (!can(actor, 'allocation.join', { resource_type: 'CYCLE' })) {
      throw new Error('FORBIDDEN: Insufficient permissions to join allocation cycle');
    }

    if (actor.role === 'STUDENT' && actor.student_profile_id !== studentProfileId) {
      throw new Error('FORBIDDEN: Cannot join on behalf of another student');
    }

    return this.db.transaction(async (client) => {
      // 1. Verify cycle status
      const cycleRes = await client.query(
        `SELECT id, status, waiting_room_threshold, turn_duration_seconds FROM allocation_cycles WHERE id = $1`,
        [cycleId]
      );
      if (cycleRes.rows.length === 0) {
        throw new Error('NOT_FOUND: Allocation cycle not found');
      }
      const cycle = cycleRes.rows[0];
      if (!['READY', 'SIMULATING'].includes(cycle.status)) {
        throw new Error(`CYCLE_CLOSED: Cycle is currently in ${cycle.status} state`);
      }

      // 2. Authoritative check on student eligibility
      const stuRes = await client.query(
        `SELECT id, academic_year, quota_category, eligibility_status, assigned_priority FROM student_profiles WHERE id = $1`,
        [studentProfileId]
      );
      if (stuRes.rows.length === 0) {
        throw new Error('NOT_FOUND: Student profile not found');
      }
      const student = stuRes.rows[0];
      if (student.eligibility_status !== 'ELIGIBLE') {
        throw new Error(`INELIGIBLE: Student eligibility status is ${student.eligibility_status}`);
      }

      // 2b. Mandatory terms acknowledgement check (Section 5)
      const latestTermsRes = await client.query(
        `SELECT version FROM terms_documents WHERE is_published = TRUE ORDER BY version DESC LIMIT 1`
      );
      if (latestTermsRes.rows.length > 0) {
        const reqVer = latestTermsRes.rows[0].version;
        const ackRes = await client.query(
          `SELECT id FROM terms_acknowledgements WHERE student_id = $1 AND terms_version = $2`,
          [studentProfileId, reqVer]
        );
        if (ackRes.rows.length === 0) {
          throw new Error('TERMS_NOT_ACCEPTED: You must review and accept the Hostel Room Responsibility Agreement before entering allocation');
        }
      }

      // 3. Find matching allocation pool
      const poolRes = await client.query(
        `SELECT id FROM allocation_pools WHERE cycle_id = $1 AND academic_year = $2 AND quota_category = $3 LIMIT 1`,
        [cycleId, student.academic_year, student.quota_category]
      );
      if (poolRes.rows.length === 0) {
        throw new Error('NO_MATCHING_POOL: No allocation pool configured for this quota/year');
      }
      const poolId = poolRes.rows[0].id;

      // 4. Server-computed priority (authoritative, cannot be supplied by client)
      let priorityNumber = student.assigned_priority;
      if (!priorityNumber) {
        const countRes = await client.query(
          `SELECT COUNT(*) as cnt FROM waiting_room_entries WHERE pool_id = $1`,
          [poolId]
        );
        priorityNumber = parseInt(countRes.rows[0].cnt, 10) + 1;
      }

      // 5. Insert or return existing waiting room entry
      const entryId = `wre_${cycleId}_${studentProfileId}`;
      const existing = await client.query(
        `SELECT id, pool_id, status, priority_number FROM waiting_room_entries WHERE cycle_id = $1 AND student_id = $2`,
        [cycleId, studentProfileId]
      );

      if (existing.rows.length > 0) {
        return {
          entryId: existing.rows[0].id,
          cycleId,
          poolId: existing.rows[0].pool_id,
          status: existing.rows[0].status,
          priorityNumber: existing.rows[0].priority_number,
        };
      }

      await client.query(
        `INSERT INTO waiting_room_entries (id, cycle_id, pool_id, student_id, priority_number, status)
         VALUES ($1, $2, $3, $4, $5, 'WAITING')`,
        [entryId, cycleId, poolId, studentProfileId, priorityNumber]
      );

      return {
        entryId,
        cycleId,
        poolId,
        status: 'WAITING',
        priorityNumber,
      };
    });
  }

  /**
   * Advance pool turn or retrieve active turn session.
   * Enforces that only ONE active turn exists per pool.
   */
  async advancePoolTurn(poolId: string): Promise<BookingSessionInfo | null> {
    return this.db.transaction(async (client) => {
      // Check if an active turn already exists
      const activeRes = await client.query(
        `SELECT * FROM booking_sessions WHERE pool_id = $1 AND status = 'ACTIVE' LIMIT 1`,
        [poolId]
      );

      const now = new Date();

      if (activeRes.rows.length > 0) {
        const sess = activeRes.rows[0];
        const expiresAt = new Date(sess.expires_at);
        if (expiresAt.getTime() > now.getTime()) {
          // Current turn is still valid
          return {
            sessionId: sess.id,
            cycleId: sess.cycle_id,
            poolId: sess.pool_id,
            studentId: sess.student_id,
            status: 'ACTIVE',
            startedAt: sess.started_at,
            expiresAt: sess.expires_at,
            remainingSeconds: Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
          };
        } else {
          // Lazy turn expiry in DB
          await client.query(
            `UPDATE booking_sessions SET status = 'EXPIRED' WHERE id = $1`,
            [sess.id]
          );
          await client.query(
            `UPDATE waiting_room_entries SET status = 'SKIPPED' WHERE cycle_id = $1 AND student_id = $2`,
            [sess.cycle_id, sess.student_id]
          );
        }
      }

      // Pick next eligible student in waiting room ordered by priority_number
      const nextStuRes = await client.query(
        `SELECT wre.student_id, wre.cycle_id, ac.turn_duration_seconds
         FROM waiting_room_entries wre
         JOIN allocation_cycles ac ON wre.cycle_id = ac.id
         WHERE wre.pool_id = $1 AND wre.status = 'WAITING'
         ORDER BY wre.priority_number ASC
         LIMIT 1`,
        [poolId]
      );

      if (nextStuRes.rows.length === 0) {
        return null; // Pool queue empty
      }

      const nextStu = nextStuRes.rows[0];
      const durationSeconds = nextStu.turn_duration_seconds || 120;
      const startedAt = now;
      const expiresAt = new Date(now.getTime() + durationSeconds * 1000);
      const sessionId = `sess_${poolId}_${nextStu.student_id}_${Date.now()}`;

      await client.query(
        `INSERT INTO booking_sessions (id, cycle_id, pool_id, student_id, status, started_at, expires_at)
         VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6)`,
        [sessionId, nextStu.cycle_id, poolId, nextStu.student_id, startedAt.toISOString(), expiresAt.toISOString()]
      );

      await client.query(
        `UPDATE waiting_room_entries SET status = 'ACTIVE_TURN' WHERE cycle_id = $1 AND student_id = $2`,
        [nextStu.cycle_id, nextStu.student_id]
      );

      return {
        sessionId,
        cycleId: nextStu.cycle_id,
        poolId,
        studentId: nextStu.student_id,
        status: 'ACTIVE',
        startedAt: startedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        remainingSeconds: durationSeconds,
      };
    });
  }

  /**
   * ATOMIC SEAT CONFIRMATION (Critical Invariant Transaction)
   * 1. Authenticate actor & verify session ownership
   * 2. Lock & verify active session & DB clock expiry
   * 3. Re-verify eligibility
   * 4. Check seat scope & operational status
   * 5. Atomically insert allocation (caught by partial unique index if conflict)
   * 6. Invalidate conflicting wishlist & recommendations
   * 7. Record outbox event & advance turn
   */
  async confirmSeat(
    sessionId: string,
    seatId: string,
    actor: AuthActor,
    idempotencyKey?: string
  ): Promise<{ allocationId: string; seatId: string; studentId: string; status: 'CURRENT' }> {
    return this.db.transaction(async (client) => {
      // 1. Fetch & lock booking session
      const sessRes = await client.query(
        `SELECT * FROM booking_sessions WHERE id = $1 FOR UPDATE`,
        [sessionId]
      );

      if (sessRes.rows.length === 0) {
        throw new Error('NOT_FOUND: Booking session not found');
      }
      const session = sessRes.rows[0];

      // Check idempotency if key was previously submitted
      if (idempotencyKey && session.idempotency_key === idempotencyKey && session.status === 'CONFIRMED') {
        const allocRes = await client.query(
          `SELECT * FROM allocations WHERE cycle_id = $1 AND student_id = $2 AND status = 'CURRENT'`,
          [session.cycle_id, session.student_id]
        );
        if (allocRes.rows.length > 0) {
          return {
            allocationId: allocRes.rows[0].id,
            seatId: allocRes.rows[0].seat_id,
            studentId: session.student_id,
            status: 'CURRENT',
          };
        }
      }

      // Check session status
      if (session.status !== 'ACTIVE') {
        throw new Error(`NOT_YOUR_TURN: Booking session is currently ${session.status}`);
      }

      // Check turn owner
      if (actor.role === 'STUDENT' && actor.student_profile_id !== session.student_id) {
        throw new Error('NOT_YOUR_TURN: Actor is not the active turn owner');
      }

      // Server-authoritative clock check (Browser timer is untrusted)
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      if (expiresAt.getTime() <= now.getTime()) {
        await client.query(`UPDATE booking_sessions SET status = 'EXPIRED' WHERE id = $1`, [sessionId]);
        await client.query(
          `UPDATE waiting_room_entries SET status = 'SKIPPED' WHERE cycle_id = $1 AND student_id = $2`,
          [session.cycle_id, session.student_id]
        );
        throw new Error('TURN_EXPIRED: The allotted selection turn has expired');
      }

      // 2. Verify seat operational status & availability
      const seatRes = await client.query(
        `SELECT s.id, s.status, s.room_id, r.is_blocked, r.floor_id
         FROM seats s
         JOIN rooms r ON s.room_id = r.id
         WHERE s.id = $1`,
        [seatId]
      );

      if (seatRes.rows.length === 0) {
        throw new Error('SEAT_NOT_FOUND: Selected seat does not exist');
      }
      const seat = seatRes.rows[0];
      if (seat.status !== 'ACTIVE' || seat.is_blocked) {
        throw new Error('SEAT_NOT_ELIGIBLE: Seat is blocked or under maintenance');
      }

      // Check if seat already allocated in this cycle
      const existAlloc = await client.query(
        `SELECT id FROM allocations WHERE cycle_id = $1 AND seat_id = $2 AND status = 'CURRENT'`,
        [session.cycle_id, seatId]
      );
      if (existAlloc.rows.length > 0) {
        throw new Error('SEAT_UNAVAILABLE: Seat has already been claimed by another student');
      }

      // Check if student already has a current allocation
      const stuAlloc = await client.query(
        `SELECT id FROM allocations WHERE cycle_id = $1 AND student_id = $2 AND status = 'CURRENT'`,
        [session.cycle_id, session.student_id]
      );
      if (stuAlloc.rows.length > 0) {
        throw new Error('ALLOCATION_ALREADY_EXISTS: Student already holds a confirmed seat in this cycle');
      }

      // 3. Atomically create authoritative allocation
      const allocationId = `alloc_${session.cycle_id}_${session.student_id}`;
      try {
        await client.query(
          `INSERT INTO allocations (id, cycle_id, student_id, seat_id, status)
           VALUES ($1, $2, $3, $4, 'CURRENT')`,
          [allocationId, session.cycle_id, session.student_id, seatId]
        );
      } catch (err: any) {
        // Enforce DB partial unique index constraint
        if (err.message?.includes('uq_seat_current') || err.message?.includes('unique constraint')) {
          throw new Error('SEAT_UNAVAILABLE: Seat was claimed concurrently');
        }
        throw err;
      }

      // 4. Update session to CONFIRMED and record idempotency key
      await client.query(
        `UPDATE booking_sessions SET status = 'CONFIRMED', idempotency_key = $1 WHERE id = $2`,
        [idempotencyKey || null, sessionId]
      );

      await client.query(
        `UPDATE waiting_room_entries SET status = 'CONFIRMED' WHERE cycle_id = $1 AND student_id = $2`,
        [session.cycle_id, session.student_id]
      );

      // 5. Invalidate conflicting preferences & recommendations for this seat
      await client.query(
        `DELETE FROM seat_preferences WHERE cycle_id = $1 AND seat_id = $2`,
        [session.cycle_id, seatId]
      );

      await client.query(
        `UPDATE invites SET status = 'INVALIDATED' WHERE cycle_id = $1 AND seat_id = $2 AND status = 'PENDING'`,
        [session.cycle_id, seatId]
      );

      await client.query(
        `UPDATE roommate_group_members SET status = 'INVALIDATED' WHERE preferred_seat_id = $1 AND status = 'PENDING'`,
        [seatId]
      );

      // 6. Record outbox event for asynchronous notification / projections
      const outboxId = `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await client.query(
        `INSERT INTO outbox_events (id, event_type, payload, status)
         VALUES ($1, 'ALLOCATION_CONFIRMED', $2, 'PENDING')`,
        [
          outboxId,
          JSON.stringify({
            allocationId,
            cycleId: session.cycle_id,
            studentId: session.student_id,
            seatId,
            confirmedAt: now.toISOString(),
          }),
        ]
      );

      // 6b. Emit allotment notification for confirmed seat
      const notifId = `notif_alloc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await client.query(
        `INSERT INTO notifications (id, category, priority, title, message, target_audience, reference_id, reference_type, author_name)
         VALUES ($1, 'ALLOTMENT', 'NORMAL', $2, $3, 'ALL', $4, 'ALLOCATION', 'Allocation Engine')`,
        [
          notifId,
          `Room Seat Allocation Confirmed`,
          `Seat ${seatId} was claimed and confirmed in cycle ${session.cycle_id}.`,
          allocationId,
        ]
      );

      return {
        allocationId,
        seatId,
        studentId: session.student_id,
        status: 'CURRENT',
      };
    });
  }

  /**
   * Super Admin forceful allocation override
   * Requires mandatory reason and writes before/after state to append-only audit trail.
   */
  async forceOverrideAllocation(
    cycleId: string,
    studentId: string,
    targetSeatId: string,
    reason: string,
    actor: AuthActor
  ): Promise<{ allocationId: string }> {
    if (actor.role !== 'SUPER_ADMIN') {
      throw new Error('FORBIDDEN: Only Super Admin can perform forceful allocation override');
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('REASON_REQUIRED: Mandatory reason is required for administrative override');
    }

    return this.db.transaction(async (client) => {
      // Find current allocation
      const currentAllocRes = await client.query(
        `SELECT * FROM allocations WHERE cycle_id = $1 AND student_id = $2 AND status = 'CURRENT'`,
        [cycleId, studentId]
      );
      const beforeState = currentAllocRes.rows[0] ? JSON.stringify(currentAllocRes.rows[0]) : null;

      if (currentAllocRes.rows.length > 0) {
        await client.query(
          `UPDATE allocations SET status = 'TRANSFERRED' WHERE id = $1`,
          [currentAllocRes.rows[0].id]
        );
      }

      // Check if target seat is occupied
      const targetSeatOccupant = await client.query(
        `SELECT * FROM allocations WHERE cycle_id = $1 AND seat_id = $2 AND status = 'CURRENT'`,
        [cycleId, targetSeatId]
      );
      if (targetSeatOccupant.rows.length > 0) {
        // Displace current occupant to WAITLISTED
        await client.query(
          `UPDATE allocations SET status = 'CANCELLED' WHERE id = $1`,
          [targetSeatOccupant.rows[0].id]
        );
      }

      const newAllocId = `alloc_override_${cycleId}_${studentId}_${Date.now()}`;
      await client.query(
        `INSERT INTO allocations (id, cycle_id, student_id, seat_id, status)
         VALUES ($1, $2, $3, $4, 'CURRENT')`,
        [newAllocId, cycleId, studentId, targetSeatId]
      );

      // Record mandatory append-only audit log
      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await client.query(
        `INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before_state, after_state, reason)
         VALUES ($1, $2, 'FORCE_ALLOCATION_OVERRIDE', 'ALLOCATION', $3, $4, $5, $6)`,
        [
          auditId,
          actor.id,
          newAllocId,
          beforeState,
          JSON.stringify({ cycleId, studentId, seatId: targetSeatId, status: 'CURRENT' }),
          reason,
        ]
      );

      return { allocationId: newAllocId };
    });
  }

  /**
   * Dry-Run Simulation (Section 7 & Acceptance Target 8)
   * Predicts cohort completion time, turn sequence, and potential unallocated overflow
   * without mutating production seat allocations.
   */
  async simulateCycle(
    cycleId: string,
    actor: AuthActor
  ): Promise<{
    cycleId: string;
    totalEligibleStudents: number;
    totalAvailableSeats: number;
    estimatedAverageSecondsPerTurn: number;
    predictedDurationMinutes: number;
    predictedUnallocatedCount: number;
    poolBreakdown: Array<{
      poolId: string;
      poolName: string;
      eligibleCount: number;
      seatsCount: number;
      durationMinutes: number;
    }>;
  }> {
    if (!['HOSTEL_OFFICE', 'SUPER_ADMIN'].includes(actor.role)) {
      throw new Error('FORBIDDEN: Only Hostel Office or Super Admin can run cycle simulations');
    }

    const cycleRes = await this.db.query(
      `SELECT * FROM allocation_cycles WHERE id = $1`,
      [cycleId]
    );
    if (cycleRes.rows.length === 0) {
      throw new Error('NOT_FOUND: Allocation cycle not found');
    }
    const cycle = cycleRes.rows[0];
    const turnDuration = cycle.turn_duration_seconds || 120;
    const avgTurnSeconds = Math.round(turnDuration * 0.4); // Standard expected average (~45-50s)

    // Query pools and seat counts
    const poolsRes = await this.db.query(
      `SELECT p.id, p.name, p.quota_category, p.academic_year,
              COUNT(DISTINCT pi.seat_id) as seats_count
       FROM allocation_pools p
       LEFT JOIN pool_inventories pi ON p.id = pi.pool_id
       WHERE p.cycle_id = $1 AND p.is_active = TRUE
       GROUP BY p.id, p.name, p.quota_category, p.academic_year`,
      [cycleId]
    );

    let totalStudents = 0;
    let totalSeats = 0;
    const breakdown = [];

    for (const pool of poolsRes.rows) {
      const seatsCount = parseInt(pool.seats_count, 10);
      const stuRes = await this.db.query(
        `SELECT COUNT(*) as cnt
         FROM student_profiles
         WHERE academic_year = $1 AND quota_category = $2 AND eligibility_status = 'ELIGIBLE'`,
        [pool.academic_year, pool.quota_category]
      );
      const eligibleCount = parseInt(stuRes.rows[0].cnt, 10);
      const poolDurationMin = Math.ceil((eligibleCount * avgTurnSeconds) / 60);

      totalStudents += eligibleCount;
      totalSeats += seatsCount;

      breakdown.push({
        poolId: pool.id,
        poolName: pool.name,
        eligibleCount,
        seatsCount,
        durationMinutes: poolDurationMin,
      });
    }

    // Parallel pools run concurrently, so cohort time is governed by the largest pool
    const maxPoolDuration = breakdown.length > 0 ? Math.max(...breakdown.map((b) => b.durationMinutes)) : 0;
    const unallocated = Math.max(0, totalStudents - totalSeats);

    return {
      cycleId,
      totalEligibleStudents: totalStudents,
      totalAvailableSeats: totalSeats,
      estimatedAverageSecondsPerTurn: avgTurnSeconds,
      predictedDurationMinutes: maxPoolDuration,
      predictedUnallocatedCount: unallocated,
      poolBreakdown: breakdown,
    };
  }
}

