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
    let sql = `SELECT c.*, COUNT(cv.id) as vote_count FROM complaints c LEFT JOIN complaint_votes cv ON c.id = cv.complaint_id `;

    if (actor.role === 'WARDEN' && actor.scope_type === 'BUILDING' && actor.scope_id) {
      sql += ` WHERE c.building_id = $1 `;
      params.push(actor.scope_id);
    } else if (buildingId) {
      sql += ` WHERE c.building_id = $1 `;
      params.push(buildingId);
    }

    sql += ` GROUP BY c.id ORDER BY c.created_at DESC`;

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

    // 1. Check feature flag on cycle
    const cycleRes = await this.db.query(
      `SELECT room_change_enabled FROM allocation_cycles WHERE id = $1`,
      [cycleId]
    );

    if (cycleRes.rows.length === 0 || !cycleRes.rows[0].room_change_enabled) {
      throw new Error('FEATURE_DISABLED: Room change requests are currently disabled for this cycle');
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
}
