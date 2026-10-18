# Changelog

All notable changes to the DORMEX College Hostel Allocation Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-10-18

### Added
- **Production PostgreSQL Database Hardening**:
  - Environment-driven `PostgresDatabaseService` in `src/db/index.ts` with pool configuration parameters (`PG_MAX_CONNECTIONS`, `PG_IDLE_TIMEOUT_MS`, `PG_CONNECTION_TIMEOUT_MS`, `PG_SSL`).
  - Added connection healthcheck probe (`SELECT 1 as alive`) and idle client error monitoring.
  - Added `docker-compose.yml` for isolated local PostgreSQL 16 containerization with alpine image and persistent volume.
  - Added `.env.example` detailing configuration parameters, secrets, and connection URIs.
- **Disjoint Pool Inventory Safeguard**:
  - Added `validatePoolDisjointInventory(cycleId)` in `src/allocation/engine.ts` guaranteeing that concurrent active pools within an allocation cycle never share seat inventory.
  - Hooked validation into `PUT /api/allocation-cycles/:id/status` prior to transitioning to `READY` or `SIMULATING`.
- **Immediate Turn Advance Optimization**:
  - Optimized `confirmSeat` endpoint in `src/app.ts` to advance the pool turn immediately upon confirmation instead of letting the wall-clock run out.
- **Architecture Enhancements Test Suite**:
  - Added `tests/architecture_enhancements.test.ts` testing DB liveness, disjoint pool invariants, conflict detection, and turn advance timing.
- **Agent & Contribution Protocol**:
  - Added `AGENTS.md` specifying commit style, pre-commit checklists, and mandatory documentation policies.

### Changed
- Standardized Vitest lifecycle hooks across test suites (`beforeAll` with extended timeouts) to eliminate timeout failures.
- Updated `docs/implementation-status.md` with complete Phase 5 milestones.

---

## [1.1.0] - 2026-10-18

### Added
- Three distinct authentication portals: `Student Portal`, `Admin / Staff Portal`, and `Hostel Office Portal`.
- 5-section comprehensive student onboarding and registration form with guardian, proctor, and fee details.
- Mandatory institutional Terms of Responsibility Agreement workflow (Version 1).
- 3-color seat availability live overlay: Green (Available), Orange (Roommate Intent), Red (Taken).
- 48-Hour Room Change request workflow with administrative review and in-person recording.
- Automated chronological priority recalculation based on staff-verified fee payment timestamp.
- Roommate group coordination using priority numbers without private contact exposure.

---

## [1.0.0] - 2026-10-12

### Added
- Initial modular monolith release of DORMEX.
- PostgreSQL relational schema with partial unique indexes (`uq_seat_current`, `uq_student_current`, `uq_pool_one_turn`).
- Server-authoritative waiting room and selection turn engine.
- Interactive SVG floor plan viewer and administrative 2D floor plan maker.
- BVB Block Floor 2 pilot demonstration with 30 synthetic students.
- Public and private complaints desk with peer community upvoting.
