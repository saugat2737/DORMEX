# Changelog

All notable changes to the DORMEX College Hostel Allocation Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.7.0] - 2026-10-18

### Added
- **Virtual Student Dataset Generator & Test Logger (`scripts/generateVirtualData.ts`)**:
  - Implemented automated virtual test data generator enforcing strict institutional USN format: `1si25<branch 2-char><3-digit code>` (e.g. `1si25cs001`, `1si25ec042`).
  - Added CLI test logger rendering console data tables with USN structure validation, branches (`CS`, `IS`, `EC`, `EE`, `ME`, `CV`, `AI`, `BT`), quota categories (`MERIT`, `SPORTS`, `PWD`, `GENERAL`), and chronological fee timestamps.
  - Built transactional database seeder (`seedVirtualStudentsIntoDb`) synchronizing virtual profiles, user credentials, roles, and terms agreements for allocation testing and load simulation.
- **Hostel Office Controllable 2D Floor Map Creator (`FloorPlanEditor.tsx`)**:
  - Upgraded Floor Plan Maker to be fully accessible under **Hostel Office** and **Admin** portals.
  - Aligned UI styling strictly to `bvb-floor-2.svg` (`viewBox="0 0 900 650"`, `#f0f0f0` background, `#bbb` structural corridors, white rooms with dark borders).
  - Added **Load BVB SVG Template** button to instantly load the full authentic 72-room architecture (Rooms 201–272).
  - Added **Add Room** modal allowing staff to place custom rooms and automatically generate child seat inventories (Type 1 single, Type 2 double, Type 3 triple).
  - Added interactive **Geometry Inspector** panel to click any room or seat, view coordinates, adjust positions and dimensions, and delete elements.
  - Added SVG Zoom controls (60% to 200%) and element filter dropdown (All, Rooms, Seats, Structural).
- **Automated Verification Suite**:
  - Added `tests/virtual_data_and_editor.test.ts` verifying USN format invariants, regex validation, student generation, database insertion, and floor map bounds.
  - Test suite total expanded to 44 automated tests with a 100% pass rate.

---

## [1.6.0] - 2026-10-18

### Added
- **Dynamic Building & Floor Selection Across Student & Admin Portals**:
  - Replaced hardcoded values with dynamic data fetching from `/api/buildings`, `/api/buildings/:id/floors`, and `/api/allocation-cycles`.
  - Added building and floor selector dropdowns in `AdminDashboard.tsx`, allowing administrators to inspect room and seat inventory across any building and floor dynamically.
  - Added building and floor selector dropdowns in `StudentAllocationView.tsx`, enabling students to inspect real floor map geometry and seat allocations across available buildings and floors.
  - Added dynamic building selection dropdown in `ComplaintsView.tsx` submission modal, allowing students and staff to file tickets for any hostel building rather than defaulting to a hardcoded block.
  - Added interactive Zoom controls (`Zoom In`, `Zoom Out`, `Reset`) with percentage scale indicator in `StudentAllocationView.tsx` for responsive SVG floor plan inspection on all viewports.

---

## [1.5.0] - 2026-10-18

### Added
- **Dry-Run Allocation Cycle Simulation (Acceptance Target 8)**:
  - Added `simulateCycle(cycleId, actor)` method to `AllocationEngineService` in `src/allocation/engine.ts`.
  - Computes predictive cohort duration, pool breakdown, average turn time, and capacity overflow warnings without mutating production allocations.
  - Added `POST /api/allocation-cycles/:id/simulate` endpoint restricted to `HOSTEL_OFFICE` and `SUPER_ADMIN`.
  - Built interactive Dry-Run Simulation Modal in `AdminDashboard.tsx` with pool duration projections, capacity analysis, and disjoint inventory verification.
  - Added test case to `tests/architecture_enhancements.test.ts` (test suite total: 39 tests, 100% pass rate).

---

## [1.4.0] - 2026-10-18

### Fixed
- **Roommate Group Acceptance & Seat Allocation Propagation**:
  - Maintained strict operational distinction between roommate invitation acceptance and final seat allocation. Accepting an invitation updates group membership and consensus without prematurely allocating seats or falsely turning seats red before authorized confirmation.
  - Added dedicated allocation success confirmation popup (`"Your Seat Is Allocated" · BVB Block · Floor 2 · Room: [number] · Seat: [label]`) triggered only when an authorized seat allocation is committed.
  - Synchronized authoritative floor map state and roommate group intent immediately upon invitation response and seat confirmation.
  - Implemented explicit user feedback (`"Roommate invitation accepted"` / `"Roommate invitation declined"`) with resilient error handling.
- **Admin & Hostel Office Complaint Desk Visibility**:
  - Enriched staff complaints query in `src/operations/service.ts` to join `users` and `rooms`, providing author student names, USNs, and room numbers for all authorized staff roles (`WARDEN`, `CHIEF_WARDEN`, `HOSTEL_OFFICE`, `SUPER_ADMIN`).
  - Guaranteed that authorized administrators view all public facility community complaints and confidential private room tickets within their building/system scope, while strictly safeguarding peer student privacy so students only see public issues and their own private tickets.
  - Upgraded `ComplaintsView.tsx` with Stitch institutional styling tokens, real-time ticket counters (Open, In Progress, Resolved), search, type/status filters, and full staff management actions (workflow progression, personnel assignment, resolution notes).
- **Enriched Student Profile Read Model**:
  - Enhanced `getProfile` query in `src/student/registry.ts` to join `seats`, `rooms`, `floors`, and `buildings`, providing full allocated seat labels, room numbers, and building names.

### Added
- **Automated Regression Test Suite**:
  - Added Section 6 to `tests/phase4_workflows.test.ts` verifying:
    1. Roommate invitation acceptance updates membership without prematurely allocating seats, surfaces orange intent, and leaves seats unallocated until priority turn confirmation.
    2. Student public and private complaints appear in the Admin Complaint Desk with full author and room metadata while preserving peer privacy.
    3. Complaint status updates and staff assignment work smoothly.
  - Test suite expanded to 38 automated tests with a 100% pass rate.

---

## [1.3.0] - 2026-10-18

### Added
- **Stitch Design System Integration & Institutional Styling**:
  - Normalized design system palette in `index.html` to official DORMEX brand tokens: Primary Deep Navy (`#203653`), Muted Teal (`#2C8279`), Sandstone Gold (`#D4B779`), Warm Ivory canvas (`#F7F6F1`), Soft Mint surface (`#E7F2ED`), Deep Text (`#263345`), Secondary Text (`#627084`), and Neutral Borders (`#E2E6E8`).
  - Integrated 5-step institutional linear onboarding progress stepper matching `student_application_terms` prototype into `StudentProfileForm.tsx`.
  - Upgraded `TermsAcknowledgementModal.tsx` with cryptographic accord styling, statutory disclaimer notice, and Agree & Continue workflow.
  - Implemented 2-column master-detail layout in `StudentRegistryView.tsx` matching `hostel_office_registry` prototype with student dossier inspector, statutory allocation rule alert, and chronological tie-breaker notice.
  - Upgraded `AdminDashboard.tsx` with Stitch `admin_allocation_control` executive KPI cards, pre-flight inventory certification banner, and live turn engine controls.
  - Aligned `StudentAllocationView.tsx` floor map with authentic BVB Floor 2 CAD coordinates, institutional 3-color availability system (`#1E7B54` Green, `#E06A26` Orange, `#C93B3B` Red, `#1D63B8` Active Selection), and bed matrix inspection.
  - Modernized `AppLayout.tsx` and `PortalSelectionView.tsx` with consistent institutional navigation chrome, collegiate branding, and role badges.

### Changed
- Refactored seat matrix rendering and room details inspection cards for crisp data density and architectural precision.
- Preserved all server-authoritative turn scheduling, fee verification, terms gating, and RBAC constraints across all 6 roles.

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
- **Administrative Audit Trail API & UI**:
  - Added `GET /api/admin/audit-logs` endpoint with role-based restriction (`SUPER_ADMIN` and `HOSTEL_OFFICE`).
  - Added real-time audit trail viewer in `AdminDashboard.tsx` displaying timestamps, action types, actors, targets, and before/after states with mandatory justification notes.
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
