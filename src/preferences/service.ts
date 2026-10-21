import { DatabaseService } from '../db/index.js';
import { AuthActor, can } from '../auth/policy.js';

export class PreferencesService {
  constructor(private db: DatabaseService) {}

  /**
   * Wishlist remaining seats in the student's confirmed room.
   * A wishlist is purely a preference; it NEVER reserves or locks seats.
   */
  async addWishlist(
    cycleId: string,
    studentProfileId: string,
    seatId: string,
    actor: AuthActor
  ): Promise<void> {
    if (!can(actor, 'wishlist.manage', { resource_type: 'STUDENT', student_id: studentProfileId })) {
      throw new Error('FORBIDDEN: Insufficient permissions for wishlist');
    }

    // 1. Verify student holds a current confirmed allocation in this cycle
    const allocRes = await this.db.query(
      `SELECT a.seat_id, s.room_id
       FROM allocations a
       JOIN seats s ON a.seat_id = s.id
       WHERE a.cycle_id = $1 AND a.student_id = $2 AND a.status = 'CURRENT'`,
      [cycleId, studentProfileId]
    );

    if (allocRes.rows.length === 0) {
      throw new Error('PRECONDITION_FAILED: Must have a confirmed seat before wishlisting remaining seats in your room');
    }

    const currentRoomId = allocRes.rows[0].room_id;

    // 2. Verify target seat belongs to the SAME room
    const targetSeatRes = await this.db.query(
      `SELECT room_id FROM seats WHERE id = $1`,
      [seatId]
    );

    if (targetSeatRes.rows.length === 0 || targetSeatRes.rows[0].room_id !== currentRoomId) {
      throw new Error('INVALID_ROOM: You can only wishlist remaining seats in your own room');
    }

    // 3. Insert preference
    const prefId = `pref_${cycleId}_${studentProfileId}_${seatId}`;
    await this.db.query(
      `INSERT INTO seat_preferences (id, student_id, cycle_id, room_id, seat_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (student_id, cycle_id, seat_id) DO NOTHING`,
      [prefId, studentProfileId, cycleId, currentRoomId, seatId]
    );
  }

  /**
   * Invite-based recommendation (replaces target-by-priority to protect student privacy).
   * Generates a single-hop invite code without exposing recipient priority or identity.
   */
  async createInvite(
    cycleId: string,
    fromStudentId: string,
    seatId: string,
    actor: AuthActor
  ): Promise<{ inviteCode: string; expiresAt: string }> {
    if (!can(actor, 'recommendation.manage', { resource_type: 'STUDENT', student_id: fromStudentId })) {
      throw new Error('FORBIDDEN: Insufficient permissions to create recommendation invite');
    }

    const inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const inviteId = `inv_${Date.now()}_${inviteCode}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await this.db.query(
      `INSERT INTO invites (id, invite_code, cycle_id, from_student_id, seat_id, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)`,
      [inviteId, inviteCode, cycleId, fromStudentId, seatId, expiresAt]
    );

    return { inviteCode, expiresAt };
  }

  async respondToInvite(
    inviteCode: string,
    toStudentId: string,
    accept: boolean,
    actor: AuthActor
  ): Promise<{ status: string }> {
    if (!can(actor, 'recommendation.manage', { resource_type: 'STUDENT', student_id: toStudentId })) {
      throw new Error('FORBIDDEN: Insufficient permissions to respond to invite');
    }

    const res = await this.db.query(
      `SELECT * FROM invites WHERE invite_code = $1 AND status = 'PENDING'`,
      [inviteCode]
    );

    if (res.rows.length === 0) {
      throw new Error('NOT_FOUND: Valid pending invite not found');
    }

    const invite = res.rows[0];
    const newStatus = accept ? 'ACCEPTED' : 'REJECTED';

    await this.db.query(
      `UPDATE invites SET status = $1, to_student_id = $2 WHERE id = $3`,
      [newStatus, toStudentId, invite.id]
    );

    return { status: newStatus };
  }

  /**
   * ROOMMATE GROUP COORDINATION (Section 8 of specifications)
   * A student enters 1 or 2 intended roommates' priority numbers for a specific room.
   * Resolves priority numbers securely without leaking private profiles.
   * Invitations require explicit recipient acceptance.
   * Creates orange-intent warning state without hard-reserving seats.
   */
  async createRoommateGroup(
    cycleId: string,
    leaderStudentId: string,
    roomId: string,
    peerPriorityNumbers: number[],
    actor: AuthActor
  ): Promise<{ groupId: string; invitedCount: number }> {
    if (!can(actor, 'roommate.manage', { resource_type: 'STUDENT', student_id: leaderStudentId })) {
      throw new Error('FORBIDDEN: Insufficient permissions to create roommate group');
    }

    return this.db.transaction(async (client) => {
      // 1. Verify room exists and check capacity
      const roomRes = await client.query(`SELECT capacity FROM rooms WHERE id = $1`, [roomId]);
      if (roomRes.rows.length === 0) throw new Error('NOT_FOUND: Room not found');
      const capacity = roomRes.rows[0].capacity;

      // Group size cannot exceed room capacity
      const totalRequested = 1 + peerPriorityNumbers.length;
      if (totalRequested > capacity) {
        throw new Error(`EXCEEDS_CAPACITY: Room capacity is ${capacity}, cannot invite ${peerPriorityNumbers.length} roommates`);
      }

      // 2. Fetch leader's priority
      const leaderRes = await client.query(
        `SELECT id, assigned_priority FROM student_profiles WHERE id = $1`,
        [leaderStudentId]
      );
      if (leaderRes.rows.length === 0) throw new Error('NOT_FOUND: Leader student profile not found');
      const leaderPriority = leaderRes.rows[0].assigned_priority || 999;

      // 3. Resolve target students by priority number securely
      const invitedStudentIds: { id: string; priority: number }[] = [];
      for (const pNum of peerPriorityNumbers) {
        if (pNum === leaderPriority) continue; // cannot invite self

        const targetRes = await client.query(
          `SELECT id, assigned_priority FROM student_profiles 
           WHERE assigned_priority = $1 AND eligibility_status = 'ELIGIBLE'`,
          [pNum]
        );

        if (targetRes.rows.length === 0) {
          throw new Error(`INVALID_PRIORITY: Priority #${pNum} is not an eligible registered participant`);
        }
        invitedStudentIds.push({ id: targetRes.rows[0].id, priority: pNum });
      }

      // 4. Create Roommate Group record
      const groupId = `rmg_${cycleId}_${leaderStudentId}_${Date.now()}`;
      await client.query(
        `INSERT INTO roommate_groups (id, cycle_id, leader_student_id, preferred_room_id, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')`,
        [groupId, cycleId, leaderStudentId, roomId]
      );

      // 5. Add leader as confirmed/accepted member
      const leaderMemberId = `rmm_${groupId}_${leaderStudentId}`;
      await client.query(
        `INSERT INTO roommate_group_members (id, group_id, student_id, priority_number, status, responded_at)
         VALUES ($1, $2, $3, $4, 'ACCEPTED', CURRENT_TIMESTAMP)`,
        [leaderMemberId, groupId, leaderStudentId, leaderPriority]
      );

      // 6. Add peer members with PENDING status
      for (const peer of invitedStudentIds) {
        const memId = `rmm_${groupId}_${peer.id}`;
        await client.query(
          `INSERT INTO roommate_group_members (id, group_id, student_id, priority_number, status)
           VALUES ($1, $2, $3, $4, 'PENDING')
           ON CONFLICT (group_id, student_id) DO UPDATE SET status = 'PENDING'`,
          [memId, groupId, peer.id, peer.priority]
        );
      }

      return { groupId, invitedCount: invitedStudentIds.length };
    });
  }

  /**
   * Recipient responds to roommate group invitation
   */
  async respondToRoommateInvite(
    groupId: string,
    studentProfileId: string,
    accept: boolean,
    actor: AuthActor
  ): Promise<{ 
    status: string;
    groupId: string;
    cycleId?: string;
    preferredRoomId?: string;
    roomNumber?: string;
    buildingId?: string;
    buildingName?: string;
    floorId?: string;
    floorNumber?: number;
    leaderName?: string;
    groupMembers?: Array<{ studentId: string; fullName: string; priorityNumber: number; status: string }>;
  }> {
    if (actor.role === 'STUDENT' && actor.student_profile_id !== studentProfileId) {
      throw new Error('FORBIDDEN: Cannot respond on behalf of another student');
    }

    const newStatus = accept ? 'ACCEPTED' : 'DECLINED';
    const res = await this.db.query(
      `UPDATE roommate_group_members SET status = $1, responded_at = CURRENT_TIMESTAMP
       WHERE group_id = $2 AND student_id = $3
       RETURNING id`,
      [newStatus, groupId, studentProfileId]
    );

    if (res.rows.length === 0) {
      throw new Error('NOT_FOUND: Pending invitation for this group was not found');
    }

    // Retrieve canonical invitation and room context for seamless allocation acknowledgement
    const groupContextRes = await this.db.query(
      `SELECT rg.id as group_id, rg.cycle_id, rg.preferred_room_id, r.room_number,
              r.floor_id, f.floor_number, b.id as building_id, b.name as building_name,
              sp.full_name as leader_name
       FROM roommate_groups rg
       JOIN rooms r ON rg.preferred_room_id = r.id
       JOIN floors f ON r.floor_id = f.id
       JOIN buildings b ON f.building_id = b.id
       JOIN student_profiles sp ON rg.leader_student_id = sp.id
       WHERE rg.id = $1`,
      [groupId]
    );

    let groupMembers: Array<{ studentId: string; fullName: string; priorityNumber: number; status: string }> = [];
    if (groupContextRes.rows.length > 0) {
      const memRes = await this.db.query(
        `SELECT rgm.student_id, rgm.priority_number, rgm.status, sp.full_name
         FROM roommate_group_members rgm
         JOIN student_profiles sp ON rgm.student_id = sp.id
         WHERE rgm.group_id = $1
         ORDER BY rgm.priority_number ASC`,
        [groupId]
      );
      groupMembers = memRes.rows.map(m => ({
        studentId: m.student_id,
        fullName: m.full_name,
        priorityNumber: m.priority_number,
        status: m.status,
      }));
    }

    const groupInfo = groupContextRes.rows[0];

    return {
      status: newStatus,
      groupId,
      cycleId: groupInfo?.cycle_id,
      preferredRoomId: groupInfo?.preferred_room_id,
      roomNumber: groupInfo?.room_number,
      buildingId: groupInfo?.building_id,
      buildingName: groupInfo?.building_name,
      floorId: groupInfo?.floor_id,
      floorNumber: groupInfo?.floor_number,
      leaderName: groupInfo?.leader_name,
      groupMembers,
    };
  }

  /**
   * Get all active roommate-intent seats on a given floor/cycle.
   * If a roommate group has preferred room R, unallocated seats in room R with accepted group intent
   * are flagged as orange-state intent.
   */
  async getRoommateIntentSeats(floorId: string, cycleId: string): Promise<Record<string, { groupId: string; roomNumber: string; isIntent: boolean }>> {
    const res = await this.db.query(
      `SELECT s.id as seat_id, r.room_number, rg.id as group_id
       FROM seats s
       JOIN rooms r ON s.room_id = r.id
       JOIN roommate_groups rg ON rg.preferred_room_id = r.id AND rg.cycle_id = $1 AND rg.status = 'ACTIVE'
       JOIN roommate_group_members rgm ON rgm.group_id = rg.id AND rgm.status = 'ACCEPTED'
       LEFT JOIN allocations a ON s.id = a.seat_id AND a.status = 'CURRENT'
       WHERE r.floor_id = $2 AND a.id IS NULL AND s.status = 'ACTIVE'`,
      [cycleId, floorId]
    );

    const intentMap: Record<string, { groupId: string; roomNumber: string; isIntent: boolean }> = {};
    for (const row of res.rows) {
      intentMap[row.seat_id] = {
        groupId: row.group_id,
        roomNumber: row.room_number,
        isIntent: true,
      };
    }
    return intentMap;
  }

  /**
   * Get student's roommate invitations (incoming & outgoing)
   */
  async getStudentRoommateGroups(studentProfileId: string, cycleId: string) {
    const incomingRes = await this.db.query(
      `SELECT rg.id as group_id, rg.cycle_id, rg.preferred_room_id, r.room_number, sp.full_name as leader_name,
              rgm.status as my_status, rgm.priority_number,
              r.floor_id, f.floor_number, b.id as building_id, b.name as building_name
       FROM roommate_group_members rgm
       JOIN roommate_groups rg ON rgm.group_id = rg.id
       JOIN student_profiles sp ON rg.leader_student_id = sp.id
       JOIN rooms r ON rg.preferred_room_id = r.id
       JOIN floors f ON r.floor_id = f.id
       JOIN buildings b ON f.building_id = b.id
       WHERE rgm.student_id = $1 AND rg.cycle_id = $2`,
      [studentProfileId, cycleId]
    );

    const outgoingRes = await this.db.query(
      `SELECT rg.id as group_id, rg.cycle_id, rg.preferred_room_id, r.room_number, rg.status as group_status,
              r.floor_id, f.floor_number, b.id as building_id, b.name as building_name
       FROM roommate_groups rg
       JOIN rooms r ON rg.preferred_room_id = r.id
       JOIN floors f ON r.floor_id = f.id
       JOIN buildings b ON f.building_id = b.id
       WHERE rg.leader_student_id = $1 AND rg.cycle_id = $2`,
      [studentProfileId, cycleId]
    );

    let outgoingMembers: any[] = [];
    if (outgoingRes.rows.length > 0) {
      const gId = outgoingRes.rows[0].group_id;
      const memRes = await this.db.query(
        `SELECT rgm.student_id, rgm.priority_number, rgm.status, sp.full_name
         FROM roommate_group_members rgm
         JOIN student_profiles sp ON rgm.student_id = sp.id
         WHERE rgm.group_id = $1
         ORDER BY rgm.priority_number ASC`,
        [gId]
      );
      outgoingMembers = memRes.rows;
    }

    return {
      incoming: incomingRes.rows,
      outgoing: outgoingRes.rows[0] ? { ...outgoingRes.rows[0], members: outgoingMembers } : null,
    };
  }
}
