





































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
- [x] **Phase 3 Pilot Implementation: BVB Block · Floor 2 · 30 Students**:
  - **Scope-controlled pilot**: Single building (`BVB Block`), single floor (`Floor 2`), and exactly 30 synthetic student records (`DEMO-001` to `DEMO-030`).
  - **Authentic Floor Geometry**: Ingested geometry from supplied `bvb-floor-2.svg` (`public/assets/floor-plans/bvb-floor-2.svg`), preserving numbered room markers 201 through 272 without altering layout or room numbering.
  - **Provisional Capacities & Seats**: Separate seat inventory records generated per room (capacities marked as provisional demonstration data).
  - **Staff Registry Management**: Dedicated Student Registry view for staff to inspect, filter, verify eligibility, and assign priority ranks.
  - **BVB Allocation Cycle & Controls**: Configured threshold to 30 with manual early cycle start capability.
  - **Verified with 22 automated tests passing across 4 test suites** (including `tests/bvb_pilot.test.ts`).
- [x] **Phase 4: Real College Workflows, Student Onboarding, Roommates, & Administrative Controls**:
  - **Three Clear Login Portals**: Implemented dedicated authentication portals (`Student Portal`, `Admin / Staff Portal`, and `Hostel Office Portal`) with warm neutral surfaces, deep navy typography, and muted teal accents. Authentication and role-based permissions are enforced strictly server-side (`Identity + Role + Scope + Resource + Action`), eliminating client-driven privilege escalation.
  - **Clean Production Experience**: Removed test aliases and confusing dev controls from production views; removed `DEV HARNESS` and mismatched `PROD` badge; dev switcher is isolated exclusively to dev mode.
  - **Comprehensive 5-Section Student Registration & Profile Workflow**: Form sections include Academic Information (with USN validation), Parent / Guardian Contact Details, Local Guardian Details (with explicit N/A option), Assigned Proctor Details, and Fee & Admission Status. Submissions transition through backend-authoritative states (`Submitted -> Under Review -> Fee Verified -> Eligible for Allocation`).
  - **Staff-Authoritative Fee Verification & Payment-Chronology Priority**: Only Hostel Office staff can verify payment evidence and confirm payment timestamps. Automated recalculation sorts priority ranks chronologically by verified payment timestamp, breaking ties deterministically by USN/college ID.
  - **Mandatory Versioned Hostel Responsibility Terms Agreement**: Seeded Version 1 of the institutional terms agreement. Students cannot enter the waiting room or select seats without an authoritative, server-timestamped terms acknowledgement record.
  - **Student Onboarding Sequence**: Structured 4-step progress tracker on student view (`1. Profile Submission -> 2. Terms Agreement -> 3. Fee Verification -> 4. Live Turn Allocation`).
  - **3-Color Seat Availability Map**: 
    - **Green**: Available for selection during student turn.
    - **Orange**: Non-binding roommate group intent. Students selecting orange seats are presented with a clear warning modal explaining that a peer group intended the room, but selection is permitted under college policy if vacant.
    - **Red**: Occupied or unavailable.
  - **Roommate Group Coordination via Priority Numbers**: Consent-based group formation where students link up using priority numbers without exposing private student contact details or internal preferences. Conflicting intents are automatically cleaned up when seats are confirmed.
  - **48-Hour Room Change Management**: Supports student-initiated room change requests within a 48-hour cycle window, validation of active allocations, staff review, atomic transfers between seats, and in-person staff recorded changes.
  - **Admin Allocation Controls & Central Complaint Inbox**: Admin lifecycle actions (`Start`, `Pause`, `Resume`, `Close`); central complaint triage supporting public facility tickets and confidential room tickets with staff assignment and resolution tracking.
  - **Verified with 32 automated tests passing across 5 test suites**.
- [x] **Phase 5: PostgreSQL Integration & Architectural Hardening (Production Standards)**:
  - **PostgreSQL Connection Pool & Resilience**: Built robust PostgreSQL database service (`PostgresDatabaseService` via `pg`) with environment-based configuration (`DATABASE_URL`, `PG_MAX_CONNECTIONS`, `PG_IDLE_TIMEOUT_MS`, `PG_CONNECTION_TIMEOUT_MS`, and `PG_SSL`), client pool error handling, and connection healthcheck diagnostics (`SELECT 1`).
  - **Docker Compose for Local PostgreSQL**: Added `docker-compose.yml` defining an isolated, persistent PostgreSQL 16 container (`dormex-postgres`) with alpine image, volume persistence, and container healthcheck for instant local setup.
  - **Environment Configuration**: Added `.env.example` defining standard production and local credentials, cookie secrets, JWT keys, and database connection options.
  - **Disjoint Pool Inventory Safeguard**: Enforced architectural invariant guaranteeing that concurrent active pools within an allocation cycle must have strictly disjoint seat inventory. Prevents pool-overlap race conditions and priority inversion across disjoint student cohorts.
  - **Immediate Turn Advance Optimization**: Optimized `confirmSeat` endpoint to advance the pool turn immediately upon confirmation rather than waiting out the remainder of the 2-minute selection window. Reduces total wall-clock duration for the cohort.
  - **Hook Lifecycle & Timeout Optimization**: Standardized Vitest integration suites to use optimized setup hooks with graceful timeouts, eliminating test runner timeouts.
  - **Verified with 36 automated tests passing across 6 test suites** (`npm test` 100% pass rate).
- [x] **Phase 7: Critical Bug Fixes — Roommate Acceptance, Seat Allocation & Admin Complaint Desk**:
  - **Roommate Group Acceptance vs Final Allocation Invariant**:
    - Preserved server-authoritative turn allocation policy: accepting an invitation registers consensus and marks roommate group membership as `ACCEPTED`. It does not bypass the turn engine or pre-allocate seats.
    - Configured orange intent (`#E06A26`) to surface non-binding roommate preference on unallocated seats across all student sessions.
    - Added dedicated `"Your Seat Is Allocated"` modal dialog (`BVB Block · Floor 2 · Room: [number] · Seat: [label]`) triggered only when an authorized allocation is committed by the backend.
    - Rendered explicit feedback on response (`"Roommate invitation accepted"` / `"Roommate invitation declined"`).
  - **Admin & Hostel Office Central Complaint Inbox**:
    - Enriched staff complaints read model to return author full name, USN, and room number.
    - Verified RBAC and privacy invariants: `SUPER_ADMIN`, `CHIEF_WARDEN`, and `HOSTEL_OFFICE` see all public and private tickets across system scope; `WARDEN` sees all tickets in their scoped building (`bld_bvb`); students strictly see only public tickets and their own private tickets.
    - Redesigned `ComplaintsView` to match Stitch design system standards with executive KPI counters, search bar, classification & status filters, and staff management modal (status workflow, assignee, resolution notes).
  - **Comprehensive Verification**:
    - Added 2 new integration test cases to `tests/phase4_workflows.test.ts` (suite total: 38 tests, 100% pass rate).
    - Verified TypeScript type check (`npm run typecheck`, 0 errors).
    - Verified production client build (`npm run build:client`).
- [x] **Phase 8: Dry-Run Allocation Cycle Simulation & Capacity Analytics (Acceptance Target 8)**:
  - **Non-Mutating Cycle Simulation Engine**:
    - Implemented `simulateCycle` in `AllocationEngineService` (`src/allocation/engine.ts`).
    - Models expected turn durations, concurrent pool throughput, and calculates predicted wall-clock completion time.
    - Evaluates cohort size versus available bed inventory, surfacing overflow warnings and waitlist projections before cycles go live.
  - **Simulation API Endpoint**:
    - Added `POST /api/allocation-cycles/:id/simulate` with strict RBAC enforcement (`HOSTEL_OFFICE`, `SUPER_ADMIN`).
  - **Simulation Analytics Modal in Admin Dashboard**:
    - Embedded Dry-Run Simulation Modal in `AdminDashboard.tsx` with KPI projection cards, inventory sufficiency indicators, and per-pool time breakdowns.
  - **Comprehensive Verification**:
    - Added integration test to `tests/architecture_enhancements.test.ts` (suite total: 39 tests, 100% pass rate).
    - Verified TypeScript typecheck (`npm run typecheck`, 0 errors) and Vite production bundle (`npm run build:client`).


