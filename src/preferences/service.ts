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
}
