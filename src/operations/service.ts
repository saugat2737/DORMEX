import { DatabaseService } from '../db/index.js';
import { AuthActor, can } from '../auth/policy.js';

export class OperationsService {
  constructor(private db: DatabaseService) {}

  /**
   * Submit Public or Private Complaint
   */
  async submitComplaint(
    input: {
      type: 'PUBLIC' | 'PRIVATE';
      building_id: string;
      room_id?: string;
      title: string;
      description: string;
    },
    actor: AuthActor
  ): Promise<{ complaintId: string }> {
    if (!can(actor, 'complaint.create')) {
      throw new Error('FORBIDDEN: Insufficient permissions to create complaint');
    }

    const complaintId = `cmp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await this.db.query(
      `INSERT INTO complaints (id, type, building_id, room_id, author_id, title, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN')`,
      [complaintId, input.type, input.building_id, input.room_id || null, actor.id, input.title, input.description]
    );

    return { complaintId };
  }

  /**
   * Vote on a public hostel complaint (Peer voter identity is strictly hidden)
   */
  async voteComplaint(complaintId: string, actor: AuthActor): Promise<void> {
    if (!can(actor, 'complaint.vote')) {
      throw new Error('FORBIDDEN: Insufficient permissions to vote on complaint');
    }

    // Check complaint is PUBLIC
    const cRes = await this.db.query(`SELECT type FROM complaints WHERE id = $1`, [complaintId]);
    if (cRes.rows.length === 0 || cRes.rows[0].type !== 'PUBLIC') {
      throw new Error('INVALID_TARGET: Can only vote on public complaints');
    }

    const voteId = `vte_${complaintId}_${actor.id}`;
    await this.db.query(
      `INSERT INTO complaint_votes (id, complaint_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (complaint_id, user_id) DO NOTHING`,
      [voteId, complaintId, actor.id]
    );
  }

  /**
   * List complaints (Enforces object authorization and privacy)
   */
  async listComplaints(actor: AuthActor, buildingId?: string) {
    if (actor.role === 'STUDENT') {
      // Students see all PUBLIC complaints (with vote counts, without voter identities or author USN)
      // and their own PRIVATE complaints.
      return this.db.query(
        `SELECT c.id, c.type, c.building_id, c.room_id, c.title, c.description, c.status, c.created_at,
                COUNT(cv.id) as vote_count
         FROM complaints c
         LEFT JOIN complaint_votes cv ON c.id = cv.complaint_id
         WHERE (c.type = 'PUBLIC' OR (c.type = 'PRIVATE' AND c.author_id = $1))
         GROUP BY c.id, c.type, c.building_id, c.room_id, c.title, c.description, c.status, c.created_at
         ORDER BY c.created_at DESC`,
        [actor.id]
      );
    }

    // Staff view with building scope checks
    const params: any[] = [];
    let sql = `
      SELECT c.id, c.type, c.building_id, c.room_id, c.author_id, c.title, c.description, c.status, 
             c.assigned_to, c.resolution_notes, c.created_at, c.updated_at,
             u.full_name as author_name, 
             u.college_id as author_college_id,
             r.room_number,
             COUNT(cv.id) as vote_count 
      FROM complaints c 
      LEFT JOIN complaint_votes cv ON c.id = cv.complaint_id 
      LEFT JOIN users u ON c.author_id = u.id
      LEFT JOIN rooms r ON c.room_id = r.id
    `;

    if (actor.role === 'WARDEN' && actor.scope_type === 'BUILDING' && actor.scope_id) {
      sql += ` WHERE c.building_id = $1 `;
      params.push(actor.scope_id);
    } else if (buildingId) {
      sql += ` WHERE c.building_id = $1 `;
      params.push(buildingId);
    }

    sql += ` GROUP BY c.id, c.type, c.building_id, c.room_id, c.author_id, c.title, c.description, c.status, c.assigned_to, c.resolution_notes, c.created_at, c.updated_at, u.full_name, u.college_id, r.room_number ORDER BY c.created_at DESC`;

    return this.db.query(sql, params);
  }

  /**
   * Room Change Requests (Backend rejects if room changes are disabled in cycle)
   */
  async requestRoomChange(
    cycleId: string,
    studentProfileId: string,
    targetRoomId: string,
    reason: string,
    actor: AuthActor
  ): Promise<{ requestId: string }> {
    if (!can(actor, 'room_change.request', { resource_type: 'STUDENT', student_id: studentProfileId })) {
      throw new Error('FORBIDDEN: Insufficient permissions to request room change');
    }

    // 1. Check feature flag & 48-hour deadline on cycle
    const cycleRes = await this.db.query(
      `SELECT room_change_enabled, room_change_window_hours, results_published_at FROM allocation_cycles WHERE id = $1`,
      [cycleId]
    );

    if (cycleRes.rows.length === 0 || !cycleRes.rows[0].room_change_enabled) {
      throw new Error('FEATURE_DISABLED: Room change requests are currently disabled for this cycle');
    }

    const cycle = cycleRes.rows[0];
    if (cycle.results_published_at) {
      const pubTime = new Date(cycle.results_published_at).getTime();
      const windowMs = (cycle.room_change_window_hours || 48) * 60 * 60 * 1000;
      if (Date.now() > pubTime + windowMs) {
        throw new Error('DEADLINE_PASSED: The 48-hour room change request window has closed');
      }
    }

    // 2. Fetch current allocation
    const allocRes = await this.db.query(
      `SELECT id FROM allocations WHERE cycle_id = $1 AND student_id = $2 AND status = 'CURRENT'`,
      [cycleId, studentProfileId]
    );

    if (allocRes.rows.length === 0) {
      throw new Error('PRECONDITION_FAILED: Must have an active allocation to request room change');
    }

    const currentAllocId = allocRes.rows[0].id;
    const reqId = `rcr_${cycleId}_${studentProfileId}_${Date.now()}`;

    await this.db.query(
      `INSERT INTO room_change_requests (id, cycle_id, student_id, current_allocation_id, target_room_id, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
      [reqId, cycleId, studentProfileId, currentAllocId, targetRoomId, reason]
    );

    return { requestId: reqId };
  }

  /**
   * List room change requests for Admin/Staff review
   */
  async listRoomChangeRequests(actor: AuthActor, cycleId?: string) {
    if (!can(actor, 'room_change.review') && !can(actor, 'room_change.request')) {
      throw new Error('FORBIDDEN: Insufficient permissions to view room change requests');
    }

    let sql = `
      SELECT rcr.*, 
             sp.full_name as student_name, sp.college_id as usn,
             cur_r.room_number as current_room_number,
             cur_s.seat_label as current_seat_label,
             tar_r.room_number as target_room_number
      FROM room_change_requests rcr
      JOIN student_profiles sp ON rcr.student_id = sp.id
      JOIN allocations cur_a ON rcr.current_allocation_id = cur_a.id
      JOIN seats cur_s ON cur_a.seat_id = cur_s.id
      JOIN rooms cur_r ON cur_s.room_id = cur_r.id
      JOIN rooms tar_r ON rcr.target_room_id = tar_r.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (actor.role === 'STUDENT') {
      sql += ` AND rcr.student_id = $${params.length + 1}`;
      params.push(actor.student_profile_id);
    } else if (cycleId) {
      sql += ` AND rcr.cycle_id = $${params.length + 1}`;
      params.push(cycleId);
    }

    sql += ` ORDER BY rcr.created_at DESC`;
    const res = await this.db.query(sql, params);
    return res.rows;
  }

  /**
   * Admin approves or rejects room change with atomic seat transfer
   */
  async reviewRoomChange(
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    notes: string,
    actor: AuthActor,
    targetSeatId?: string
  ): Promise<void> {
    if (!can(actor, 'room_change.review')) {
      throw new Error('FORBIDDEN: Only authorized staff can review room change requests');
    }

    return this.db.transaction(async (client) => {
      const reqRes = await client.query(
        `SELECT * FROM room_change_requests WHERE id = $1 FOR UPDATE`,
        [requestId]
      );
      if (reqRes.rows.length === 0) throw new Error('NOT_FOUND: Room change request not found');
      const request = reqRes.rows[0];

      if (request.status !== 'PENDING') {
        throw new Error(`ALREADY_RESOLVED: Request is already ${request.status}`);
      }

      if (decision === 'REJECTED') {
        await client.query(
          `UPDATE room_change_requests SET status = 'REJECTED', reviewer_user_id = $1, review_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [actor.id, notes, requestId]
        );
        return;
      }

      // APPROVAL: Find an available seat in the target room
      let seatId = targetSeatId || request.target_seat_id;
      if (!seatId) {
        const availRes = await client.query(
          `SELECT s.id FROM seats s
           LEFT JOIN allocations a ON s.id = a.seat_id AND a.status = 'CURRENT'
           WHERE s.room_id = $1 AND s.status = 'ACTIVE' AND a.id IS NULL
           LIMIT 1`,
          [request.target_room_id]
        );
        if (availRes.rows.length === 0) {
          throw new Error('SEAT_UNAVAILABLE: No eligible available seats in target room');
        }
        seatId = availRes.rows[0].id;
      } else {
        // Verify target seat is currently active and free
        const seatCheck = await client.query(
          `SELECT s.id, s.status, a.id as alloc_id FROM seats s
           LEFT JOIN allocations a ON s.id = a.seat_id AND a.status = 'CURRENT'
           WHERE s.id = $1 AND s.room_id = $2`,
          [seatId, request.target_room_id]
        );
        if (seatCheck.rows.length === 0 || seatCheck.rows[0].status !== 'ACTIVE' || seatCheck.rows[0].alloc_id) {
          throw new Error('SEAT_UNAVAILABLE: Specified target seat is occupied or unavailable');
        }
      }

      // ATOMIC MOVE: Transfer previous allocation, insert new allocation
      await client.query(
        `UPDATE allocations SET status = 'TRANSFERRED' WHERE id = $1`,
        [request.current_allocation_id]
      );

      const newAllocId = `alloc_${request.cycle_id}_${request.student_id}_rc_${Date.now()}`;
      await client.query(
        `INSERT INTO allocations (id, cycle_id, student_id, seat_id, status)
         VALUES ($1, $2, $3, $4, 'CURRENT')`,
        [newAllocId, request.cycle_id, request.student_id, seatId]
      );

      await client.query(
        `UPDATE room_change_requests SET status = 'APPROVED', target_seat_id = $1, reviewer_user_id = $2, review_notes = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [seatId, actor.id, notes, requestId]
      );

      // Audit log
      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await client.query(
        `INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before_state, after_state, reason)
         VALUES ($1, $2, 'ROOM_CHANGE_APPROVED', 'ALLOCATION', $3, $4, $5, $6)`,
        [
          auditId,
          actor.id,
          request.student_id,
          JSON.stringify({ old_allocation_id: request.current_allocation_id }),
          JSON.stringify({ new_allocation_id: newAllocId, seat_id: seatId, room_id: request.target_room_id }),
          notes || 'Staff approved room change request',
        ]
      );
    });
  }

  /**
   * Admin in-person room change request recording
   */
  async recordInPersonRoomChange(
    cycleId: string,
    studentProfileId: string,
    targetRoomId: string,
    reason: string,
    actor: AuthActor,
    autoApprove?: boolean
  ): Promise<{ requestId: string }> {
    if (!can(actor, 'room_change.review')) {
      throw new Error('FORBIDDEN: Only authorized staff can record in-person room change');
    }

    const allocRes = await this.db.query(
      `SELECT id FROM allocations WHERE cycle_id = $1 AND student_id = $2 AND status = 'CURRENT'`,
      [cycleId, studentProfileId]
    );

    if (allocRes.rows.length === 0) {
      throw new Error('PRECONDITION_FAILED: Student has no active allocation');
    }

    const reqId = `rcr_inp_${cycleId}_${studentProfileId}_${Date.now()}`;
    await this.db.query(
      `INSERT INTO room_change_requests (id, cycle_id, student_id, current_allocation_id, target_room_id, reason, is_in_person, recorded_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, 'PENDING')`,
      [reqId, cycleId, studentProfileId, allocRes.rows[0].id, targetRoomId, reason, actor.id]
    );

    if (autoApprove) {
      await this.reviewRoomChange(reqId, 'APPROVED', 'In-person immediate administrative transfer', actor);
    }

    return { requestId: reqId };
  }

  /**
   * Central Admin Complaint Updates: Assignment & Resolution
   */
  async updateComplaint(
    complaintId: string,
    data: {
      status?: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
      assignedTo?: string;
      resolutionNotes?: string;
    },
    actor: AuthActor
  ): Promise<void> {
    if (!can(actor, 'complaint.manage')) {
      throw new Error('FORBIDDEN: Insufficient permissions to manage complaint');
    }

    await this.db.query(
      `UPDATE complaints SET
        status = COALESCE($1, status),
        assigned_to = COALESCE($2, assigned_to),
        resolution_notes = COALESCE($3, resolution_notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [data.status || null, data.assignedTo || null, data.resolutionNotes || null, complaintId]
    );
  }
}
