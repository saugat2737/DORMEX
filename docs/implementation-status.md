





































# DORMEX Implementation Status & Technical Decisions

Last Updated: 2026-10-12
Repository Status: Active Development (Modular Monolith)

## 1. System Architecture & Stack
- **Architecture**: Modular Monolith with transactional relational core and derived read models.
- **Backend**: TypeScript + Fastify + Zod validation.
- **Database Engine**: PostgreSQL relational schema with database-enforced integrity (partial unique indexes, transactional locking). Compatible with real PostgreSQL server via `DATABASE_URL` and built-in zero-dependency in-memory PostgreSQL engine (`pg-mem`) with schema parity for standalone tests and local runs.
- **Frontend / Client Map**: Responsive web app with SVG rendering for students and interactive 2D floor-plan geometry editor for administrators.

## 2. Established Provisional Defaults (As specified in master guidelines)
1. **Database**: PostgreSQL (relational integrity, transactional locks, partial unique indexes for allocation invariants).
2. **Wishlist targeting**: Dropped target-by-priority identifier in favor of invite-based recommendations to prevent student priority leaks.
3. **Late-arrival reference**: Computed from student's scheduled turn start (`now - turn_start`), with 6-minute grace, configurable penalty turns up to 10 passed turns, max resulting wait 22 min. Late students are inserted into calculated queue position rather than appended.
4. **Peer-room view**: Defaults to `OFF` for privacy-first posture; configurable per cycle (`OFF`, `AFTER_OWN_CONFIRM`, `LIVE`).
5. **Pool splitting**: Concurrently active pools must have disjoint seat inventory.
6. **No seat available**: Students without seats are marked in explicit `WAITLISTED` / staff review state; never discarded or falsely allocated.
7. **Authentication**: Provider-based SSO/OTP structure with secure sessions; local dev seed mode is strictly segregated.
8. **Redis**: Deferred until measured multi-instance live push requirement. In-process event fanout + database clock used for single-instance/testing.
9. **Building scaling**: New buildings introduced entirely through data (database records & versioned floor map geometry) without code modifications.
10. **Cycle configuration**: Frozen and immutable once state transitions to `READY`. Rule modifications necessitate a new cycle configuration version.

## 3. Implementation Phases
- [x] **Phase A: Repository Foundation** (Node v22, TypeScript, Fastify, Zod, Vitest, pg-mem/Postgres DB harness)
- [x] **Phase B: Schema & Authorization Engine** (Full relational schema, migrations, `can(actor, action, resource)` policy layer, seed data, auth)
- [x] **Phase C: Hostel Inventory & Floor Plan Geometry Engine** (Buildings, floors, rooms, seats, 2D floor map schema, validation, SVG viewer)
- [x] **Phase D: Student Registry & Eligibility** (Staff-controlled registration, quota types, eligibility verification, priority ordering)
- [x] **Phase E: Priority-Based Allocation Engine** (Waiting room, server-authoritative timer, queue calculation, atomic seat confirmation, idempotency)
- [x] **Phase F: Visibility, Wishlist, Recommendations & Outbox** (Invite-based recommendations, room wishlists, outbox notifications)
- [x] **Phase G: Operations & Admin Dashboard** (Public & private complaints, room change requests, Super Admin force-move override with audit trail)
- [x] **Phase H: Verification & Test Suite** (Concurrency races, IDOR security tests, turn expiry, idempotency, privacy verification)
- [x] **Phase 2 Frontend & Live Map**:
  - React + TypeScript + Vite production client.
  - Interactive Admin 2D Floor Plan Maker with room/bed calibration, draft saving, and immutable version publishing.
  - Student Waiting Room and Live Floor Map with real-time seat availability overlays, turn timer countdown, atomic selection confirmation, roommate room wishlists, and one-hop invite codes.
  - Complaints desk with public facility anonymous peer upvoting and confidential room tickets.
  - Staff Operational Dashboard with telemetry, campus block inventories, and active allocation cycles.
  - Verified with 16 automated tests passing across 3 test suites.
