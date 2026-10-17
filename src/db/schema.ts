import { DatabaseService } from './index.js';

export const SCHEMA_SQL = `
-- Extensions & Clean Schema
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    college_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    module TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL DEFAULT 'SYSTEM', -- 'SYSTEM', 'BUILDING', 'STUDENT'
    scope_id TEXT, -- e.g. building_id or NULL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    college_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    academic_year INT NOT NULL, -- 1, 2, 3, 4
    department TEXT NOT NULL,
    gender TEXT NOT NULL,
    quota_category TEXT NOT NULL, -- 'GENERAL', 'MERIT', 'SPORTS', 'PWD', 'NRI'
    eligibility_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ELIGIBLE', 'INELIGIBLE', 'FEE_PENDING'
    assigned_priority INT, -- Staff assigned priority rank (1 = highest priority)
    proctor_user_id TEXT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    gender_designation TEXT NOT NULL, -- 'MALE', 'FEMALE', 'COED'
    total_floors INT NOT NULL DEFAULT 4,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS floors (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    floor_number INT NOT NULL,
    label TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_id, floor_number)
);

CREATE TABLE IF NOT EXISTS floor_maps (
    id TEXT PRIMARY KEY,
    floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED'
    geometry_json TEXT NOT NULL, -- structured JSON
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 2,
    room_type TEXT NOT NULL DEFAULT 'DOUBLE', -- 'SINGLE', 'DOUBLE', 'TRIPLE', 'SUITE'
    eligible_academic_years TEXT NOT NULL DEFAULT 'ALL', -- 'ALL' or comma-separated '1,2'
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(floor_id, room_number)
);

CREATE TABLE IF NOT EXISTS seats (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    seat_label TEXT NOT NULL, -- 'A', 'B', 'C'
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'BLOCKED', 'MAINTENANCE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, seat_label)
);

CREATE TABLE IF NOT EXISTS allocation_cycles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    academic_year INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SIMULATING', 'READY', 'PUBLISHED', 'LOCKED'
    turn_duration_seconds INT NOT NULL DEFAULT 120, -- 2 minutes
    waiting_room_threshold INT NOT NULL DEFAULT 45,
    late_grace_seconds INT NOT NULL DEFAULT 360, -- 6 minutes
    max_penalty_turns INT NOT NULL DEFAULT 10,
    peer_room_view_mode TEXT NOT NULL DEFAULT 'OFF', -- 'OFF', 'AFTER_OWN_CONFIRM', 'LIVE'
    room_change_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    config_frozen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS allocation_pools (
    id TEXT PRIMARY KEY,
    cycle_id TEXT NOT NULL REFERENCES allocation_cycles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quota_category TEXT NOT NULL,
    academic_year INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pool_inventories (
    id TEXT PRIMARY KEY,
    pool_id TEXT NOT NULL REFERENCES allocation_pools(id) ON DELETE CASCADE,
    seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    UNIQUE(pool_id, seat_id)
);

CREATE TABLE IF NOT EXISTS waiting_room_entries (
    id TEXT PRIMARY KEY,
    cycle_id TEXT NOT NULL REFERENCES allocation_cycles(id) ON DELETE CASCADE,
    pool_id TEXT NOT NULL REFERENCES allocation_pools(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    priority_number INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'ACTIVE_TURN', 'CONFIRMED', 'SKIPPED', 'WAITLISTED'
    scheduled_turn_start TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cycle_id, student_id)
);

CREATE TABLE IF NOT EXISTS booking_sessions (
    id TEXT PRIMARY KEY,
    cycle_id TEXT NOT NULL REFERENCES allocation_cycles(id) ON DELETE CASCADE,
    pool_id TEXT NOT NULL REFERENCES allocation_pools(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'PENDING', 'ACTIVE', 'CONFIRMED', 'EXPIRED', 'CANCELLED'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    idempotency_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS allocations (
    id TEXT PRIMARY KEY,
    cycle_id TEXT NOT NULL REFERENCES allocation_cycles(id) ON DELETE RESTRICT,
    student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
    seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'CURRENT', -- 'CURRENT', 'CANCELLED', 'TRANSFERRED'
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partial Unique Constraints for Invariant Enforcement:
-- At most one CURRENT allocation per seat per cycle
CREATE UNIQUE INDEX IF NOT EXISTS uq_seat_current ON allocations (cycle_id, seat_id) WHERE status = 'CURRENT';
-- At most one CURRENT allocation per student per cycle
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_current ON allocations (cycle_id, student_id) WHERE status = 'CURRENT';
-- At most one active turn per pool
CREATE UNIQUE INDEX IF NOT EXISTS uq_pool_one_turn ON booking_sessions (pool_id) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS seat_preferences (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    cycle_id TEXT NOT NULL REFERENCES allocation_cycles(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, cycle_id, seat_id)
);

CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    invite_code TEXT UNIQUE NOT NULL,
    cycle_id TEXT NOT NULL REFERENCES allocation_cycles(id) ON DELETE CASCADE,
    from_student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    to_student_id TEXT REFERENCES student_profiles(id) ON DELETE CASCADE,
    seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED', 'INVALIDATED', 'DECLINED_BY_SELECTION'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'PUBLIC', 'PRIVATE'
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaint_votes (
    id TEXT PRIMARY KEY,
    complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(complaint_id, user_id)
);

CREATE TABLE IF NOT EXISTS room_change_requests (
    id TEXT PRIMARY KEY,
    cycle_id TEXT NOT NULL REFERENCES allocation_cycles(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    current_allocation_id TEXT NOT NULL REFERENCES allocations(id) ON DELETE CASCADE,
    target_room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    reviewer_user_id TEXT REFERENCES users(id),
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    before_state TEXT,
    after_state TEXT,
    reason TEXT,
    correlation_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outbox_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSED', 'FAILED'
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);
`;

export async function runMigrations(db: DatabaseService): Promise<void> {
  const statements = SCHEMA_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await db.query(statement);
    } catch (err: any) {
      // Ignore existing index / table warnings if idempotent
      if (!err.message?.includes('already exists')) {
        throw err;
      }
    }
  }
}
