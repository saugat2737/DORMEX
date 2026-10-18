# College Hostel Allocation System — System Design

## 1. Context

Actors:

```text
Student
Proctor
Warden
Chief Warden
Hostel Office
Super Admin
```

Core domains:

```text
Identity
Student Registry
Eligibility
Priority
Inventory
Allocation
Wishlist
Recommendation
Occupancy
Complaints
Room Change
Notifications
Audit
```

## 2. Deployment

Recommended initial topology:

```text
Internet / College Network
          |
       Nginx/Caddy
          |
     Backend App
          |
   PostgreSQL/MySQL
          |
       Backups
```

Keep the deployment small. Add Redis only after measurement shows a real need.

## 3. Data model

### Identity

```text
users
roles
user_roles
role_scopes
sessions
```

### Students

```text
students
student_academic_records
student_hostel_profiles
eligibility_groups
quota_types
priority_assignments
```

### Inventory

```text
buildings
floors
rooms
seats
room_eligibility
room_maps
```

Relationships:

```text
building 1:N floor
floor 1:N room
room 1:N seat
```

### Allocation

```text
allocation_cycles
allocation_pools
allocation_rules
waiting_room_entries
booking_sessions
allocations
allocation_history
```

### Preferences

```text
seat_preferences
recommendations
```

### Complaints

```text
complaints
complaint_confirmations
complaint_votes
complaint_assignments
```

### Other

```text
room_change_requests
notifications
outbox_events
audit_logs
```

## 4. Important constraints

Enforce at the database/application boundary:

```text
one current allocation per seat per cycle
one current allocation per student per cycle
one active booking session per student/cycle
one active global turn per allocation pool
```

Use unique/partial indexes or equivalent transactions supported by the selected database.

## 5. Waiting-room indexing

Important indexes:

```text
waiting_room_entries(cycle_id, status, priority_number)
waiting_room_entries(cycle_id, entered_at)
```

This lets the system efficiently find the next eligible participant.

## 6. Booking session

```text
booking_sessions
----------------
id
cycle_id
student_id
turn_sequence
status
started_at
expires_at
created_at
```

Statuses:

```text
PENDING
ACTIVE
CONFIRMED
EXPIRED
CANCELLED
```

The client countdown is never the authority.

## 7. Allocation transaction

```text
BEGIN

verify cycle is active
verify session belongs to actor
verify session ACTIVE
verify current server time < expires_at
verify student eligibility
verify requested room/seat is eligible
lock/check seat
verify seat still available
create allocation
invalidate preference/recommendation state
write audit/outbox data
COMMIT
```

If another transaction has already taken the seat, the request returns a deterministic conflict.

## 8. Wishlist storage

A preference record may contain:

```text
id
cycle_id
student_id
room_id
seat_id
target_student_id / target_priority
rank
status
created_at
updated_at
```

The physical seat must remain:

```text
AVAILABLE
```

while merely wishlisted.

When allocated:

```text
seat → OCCUPIED
preference → INVALIDATED
related recommendation → INVALIDATED
```

## 9. Recommendation state machine

```text
CREATED
  ├── ACCEPTED
  │     ├── FULFILLED
  │     └── INVALIDATED
  ├── REJECTED
  └── INVALIDATED
```

There is no transition to another recommendation.

## 10. Priority-aware resolution

Example:

```text
Seat B → target Priority 20
```

Priority 8 may claim B because:

```text
8 < 20
```

After Priority 8 confirms:

```text
B = 8
target 20 = invalid
recommendation = invalid
```

A lower-priority student does not gain a right to displace the targeted priority.

## 11. Read models

Do not use one table per user.

Useful projections:

### Student

```text
student_dashboard_projection
student_id
cycle_id
priority
eligibility_status
allocation_status
building_id
room_id
seat_id
roommate_summary
complaint_summary
notification_summary
updated_at
```

### Building

```text
building_occupancy_projection
building_id
total_seats
occupied_seats
available_seats
blocked_seats
updated_at
```

### Proctor

```text
proctor_student_projection
proctor_id
student_id
year
building_id
room_id
seat_id
```

These are derived performance structures, not sources of truth.

## 12. Outbox

For events such as allocation confirmation:

```text
transaction
  ↓
source-of-truth mutation
  +
outbox event
  ↓
background worker
  ├── notification
  └── read-model update
```

This prevents notification failure from invalidating an otherwise successful allocation.

## 13. Map architecture

Store map metadata rather than hardcoding the entire map in application code.

Possible data:
- floor;
- room ID;
- logical coordinates;
- room geometry;
- seat positions;
- labels;
- availability state.

Static geometry can be cached aggressively. Dynamic occupancy must come from current state/read models.

## 14. Authorization pipeline

```text
Authenticate
  ↓
Identify actor
  ↓
Resolve role
  ↓
Resolve scope
  ↓
Resolve target resource
  ↓
Authorize action
  ↓
Execute
```

This is essential for preventing IDOR and privilege escalation.

## 15. API style

Prefer business operations:

```text
POST /allocation-cycles/{id}/join
POST /booking-sessions/{id}/confirm-seat
POST /seats/{id}/wishlist
POST /recommendations/{id}/respond
POST /complaints
POST /room-change-requests
POST /admin/allocations/{id}/force-move
```

Avoid generic row mutation endpoints.

## 16. Error model

Useful domain errors:

```text
TURN_EXPIRED
NOT_YOUR_TURN
SEAT_UNAVAILABLE
SEAT_NOT_ELIGIBLE
CYCLE_CLOSED
ALLOCATION_ALREADY_EXISTS
INSUFFICIENT_SCOPE
RECOMMENDATION_INVALID
```

## 17. Concurrency

Allocation concurrency is deliberately controlled:

```text
many waiting
   ↓
one active chooser
   ↓
short transaction
```

This protects a low-end server while making the hardest race condition—same-seat contention—small and deterministic.

Normal browsing remains concurrent and uses read models/indexes.

## 18. Security layers

```text
TLS
 ↓
Authentication
 ↓
Session security
 ↓
Role authorization
 ↓
Scope authorization
 ↓
Object-level authorization
 ↓
Input validation
 ↓
Transaction integrity
 ↓
Database constraints
 ↓
Audit
```

Test specifically for:
- IDOR;
- privilege escalation;
- altered student IDs;
- altered priority;
- altered room IDs;
- altered expiry;
- replayed confirmation;
- stale sessions;
- unauthorized publication;
- unauthorized override;
- complaint privacy leakage.

## 19. Backup/recovery

Provide:
- scheduled database backups;
- retention;
- restoration tests;
- allocation-history retention;
- audit-log retention.

The source-of-truth database must be sufficient to reconstruct derived state.

## 20. Low-end server optimization

Avoid:
- microservices without need;
- high-frequency polling;
- full-hostel recalculation;
- huge response payloads;
- loading all students/rooms into memory;
- synchronous notification fan-out.

Prefer:
- indexed SQL;
- compact responses;
- pagination;
- static assets;
- short transactions;
- read models;
- background jobs;
- controlled allocation concurrency.

## 21. Failure behavior

### Same seat race
Exactly one transaction succeeds.

### Browser timer manipulation
No effect.

### Expired browser
Server rejects.

### Changed priority
Server rejects/ignores client value.

### Wrong building for Warden
Scope check rejects.

### Private complaint access
Object-level check rejects.

### Recommendation seat taken
Recommendation invalidated automatically.

### Target chooses another seat
Recommendation becomes obsolete.

### Concurrent pools in cycle
Pools must have disjoint seat inventory. Any intersection fails validation before cycle start.

### Seat confirmation advance
Immediate turn advance signals next student queue turn without waiting out the full 2-minute booking window.

### Super Admin override
Recorded with reason and before/after state.

## 22. Architectural separation

```text
AUTHORITATIVE
  normalized transactional database

DERIVED
  dashboard/occupancy/read models

EPHEMERAL
  active sessions
  queue presence
  short-lived cache
```

This separation is the foundation for both correctness and performance.
