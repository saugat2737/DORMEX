# DORMEX — College Hostel Allocation System

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

### End-to-End API Flow
1. **Health Check**: `GET /health`
2. **Interactive SVG Map**: `GET /api/floors/:id/svg`
3. **Join Waiting Room**: `POST /api/allocation-cycles/:id/join`
4. **Advance Pool Turn**: `POST /api/allocation-pools/:id/advance`
5. **Confirm Seat (Atomic)**: `POST /api/booking-sessions/:id/confirm-seat`
6. **Submit Complaint**: `POST /api/complaints`
7. **Vote Complaint**: `POST /api/complaints/:id/vote`
8. **Super Admin Force Override**: `POST /api/admin/allocations/force-override`
