/# DORMEX — College Hostel Allocation System

DORMEX is a secure, production-grade, centralized college hostel registration, priority-based seat allocation, floor-plan visualization, occupancy management, complaints, and room change platform.

## Architecture Highlights
- **Modular Monolith**: Clean domain boundaries (`auth`, `student`, `inventory`, `allocation`, `preferences`, `operations`, `db`).
- **Relational Source of Truth**: PostgreSQL relational schema enforcing database-level integrity invariants via partial unique indexes:
  - `uq_seat_current`: At most one `CURRENT` allocation per seat per cycle.
  - `uq_student_current`: At most one `CURRENT` allocation per student per cycle.
  - `uq_pool_one_turn`: Exactly one active turn per pool at any given time.
- **Server-Authoritative Allocation Engine**: Client clocks and client priorities are strictly untrusted. Lateness penalties, turns, and timeouts are enforced against server/database timestamps.
- **Privacy-First Design**: Student priority numbers are kept private and never exposed to peers. Wishlists are purely non-reserving room preferences, and peer coordination is handled via one-hop invite codes.
- **Zero-Dependency Test & Development Harness**: Dual-engine PostgreSQL connector supporting live PostgreSQL servers via `DATABASE_URL` and embedded in-memory PostgreSQL engine (`pg-mem`) for test suites and rapid development without requiring external database services.

## Roles & Permissions
1. **Student**: View own profile/priority/turn, join waiting room, select seat during turn, wishlist room beds, invite peers, raise public/private complaints, submit room changes.
2. **Proctor**: Transparent view of assigned students only; no allocation authority.
3. **Warden**: Scoped management for assigned building.
4. **Chief Warden**: Full management across all campus buildings.
5. **Hostel Office**: Student registration, eligibility verification, quota/priority management, and cycle setup.
6. **Super Admin**: System configuration and forceful allocation override requiring mandatory reason and append-only audit trail.

## Getting Started

### Prerequisites
- Node.js >= v20
- npm >= v10

### Installation
```bash
npm install
```

### Running Tests and Typecheck
```bash
npm run test
npm run typecheck
```

### Running the Server
```bash
npm start
```
By default, the server listens at `http://localhost:3000`.

### Pilot Demonstration: BVB Block · Floor 2 · 30 Students
The pilot implementation is configured for:
- **Active Building**: BVB Block
- **Active Floor**: Floor 2 (`bvb-floor-2.svg`, numbered room markers 201 through 272)
- **Synthetic Demo Students**: Exactly 30 records (`DEMO-001` through `DEMO-030`)
- **Provisional Bed Capacities**: Separate seat inventory per room labelled provisional until verified by the hostel.
- **Cycle Controls**: Threshold configured to 30 students with staff manual early start capability.

### End-to-End API Flow
1. **Health Check**: `GET /health`
2. **Interactive SVG Map**: `GET /api/floors/:id/svg`
3. **Student Registration & Profile**: `PUT /api/students/:id/profile`, `POST /api/students/:id/submit-profile`
4. **Terms of Responsibility Agreement**: `GET /api/terms/latest`, `POST /api/terms/accept`
5. **Fee Verification & Priority Recalculation**: `POST /api/students/:id/verify-fee`, `POST /api/allocation/recalculate-priorities`
6. **Roommate Coordination & Seat Intent**: `POST /api/roommate-groups`, `POST /api/roommate-groups/:id/respond`, `GET /api/floors/:id/roommate-intent`
7. **Join Waiting Room & Turn Execution**: `POST /api/allocation-cycles/:id/join`, `POST /api/allocation-pools/:id/advance`, `POST /api/booking-sessions/:id/confirm-seat`
8. **48-Hour Room Change Window**: `POST /api/room-change-requests`, `PUT /api/room-change-requests/:id/review`, `POST /api/room-change-requests/in-person`
9. **Complaints & Operations**: `POST /api/complaints`, `PUT /api/complaints/:id`, `POST /api/complaints/:id/vote`
10. **Admin Allocation Controls**: `PUT /api/allocation-cycles/:id/status`, `POST /api/admin/allocations/force-override`

### Portals & Login Experience
When accessing DORMEX, users are presented with 3 distinct portals:
- **Student Portal**: Student registration, terms agreement, fee status check, live map turn selection, roommate groups, 48h room changes, complaints.
- **Admin / Staff Portal**: Allocation cycle lifecycle control (Start, Pause, Resume, Close), central complaint inbox, room change approvals, in-person requests.
- **Hostel Office Portal**: Student application review, fee payment verification, chronological priority recalculation, allocation readiness monitoring.
