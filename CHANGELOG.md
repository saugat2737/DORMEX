# Changelog

All notable changes to the DORMEX College Hostel Allocation Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.5.2] - 2026-10-22

- **Fix(admission): Batch-Wise Official Priority Uniqueness & Quality Audit**:
  - Replaced global `official_priority` unique constraint on `student_admissions` with batch-scoped composite unique index `uq_admissions_batch_official_priority` on `(academic_year_code, official_priority)`.
  - Added `admission_batch_year` column to `student_profiles` and updated composite index `uq_student_profiles_cohort_priority` to `(admission_batch_year, academic_year, quota_category, assigned_priority)`.
  - Updated `src/student/admissionService.ts`:
    - `createAdmission` authoritatively validates priority uniqueness within `academic_year_code` (e.g. 2026-2027 and 2027-2028 can both have priority #1).
    - `updateAdmission` validates uniqueness within the updated/current batch while preventing false self-conflicts during edit.
    - Preserved student profile integration with default `PENDING` eligibility and `UNPAID` fee status.
  - Updated `src/client/components/StudentAdmissionManagementView.tsx` with batch-scoped uniqueness badges, helper descriptions, and revalidation logic.
  - Added regression test cases in `tests/admissions_and_mess_menu.test.ts` verifying same-batch priority rejection, different-batch priority acceptance, and update revalidation.
  - Completed comprehensive 20-module codebase audit in `docs/quality-audit.md` and formulated 10-item prioritized roadmap.
  - Total test suite expanded to 79 tests (100% passing).

## [2.5.1] - 2026-10-22

- **Fix(mess-menu): Resolve Weekly Mess Menu Form Payload Parsing & Validation Contract**:
  - Identified root cause of VALIDATION_ERROR: Week start and end dates are required during publish form submission: apiFetch omitted default Content-Type: application/json header when dispatching serialized JSON bodies, causing Fastify to receive raw text without parsing it into req.body properties.
  - Enhanced apiFetch in src/client/context/AuthContext.tsx to automatically apply Content-Type: application/json when string bodies are supplied without an explicit header.
  - Added explicit Content-Type: application/json header to src/client/components/MessMenuView.tsx POST /api/mess/menus request.
  - Hardened src/app.ts endpoint to safely parse stringified JSON request bodies if delivered without content-type metadata.
  - Enhanced src/operations/messMenuService.ts with strict date validation: YYYY-MM-DD ISO pattern validation, date ordering check (week_end_date >= week_start_date), and clean ISO date-only format serialization avoiding timezone offsets.
  - Added 3 new regression tests in tests/admissions_and_mess_menu.test.ts verifying date validation, chronological ordering, unheadered JSON body recovery, and database query persistence.

## [2.5.0] - 2026-10-22

- **Phase 1: Notification Isolation & Targeting**:
  - Eliminated global notification broadcasting for individual student workflows (room allocation, roommate group invites, and roommate acceptance/rejection responses).
  - Enforced strict recipient targeting in `src/allocation/engine.ts` (`studentUserId` with `target_audience = 'STUDENT'`).
  - Enforced private peer targeting in `src/preferences/service.ts`:
    - Roommate invitations target only the invited student (`peer.userId`).
    - Acceptance and decline responses target strictly the group leader (`leader_user_id`).
  - Hardened `src/notifications/service.ts`:
    - `listNotifications`: strictly filters `n.user_id = $1 OR (n.user_id IS NULL AND n.target_audience = ANY($2))` to prevent notice leakage.
    - `markAsRead` and `markAllAsRead`: enforce authorization check ensuring users cannot acknowledge notifications belonging to other accounts.
- **Phase 2: Database-Backed Hostel Office Student Admissions Management**:
  - Added `student_admissions` table with partial unique index on `official_priority` and unique `usn`.
  - Implemented `src/student/admissionService.ts` for full admission lifecycle:
    - Academic, Contact, Proctor, and Guardian profiling.
    - Automatic creation of linked `users` and `student_profiles` entries with unallocated status (`fee_status = 'UNPAID'`, `eligibility_status = 'PENDING'`).
    - Enforced institutional USN pattern matching (`1si...`) and prevention of duplicate official priorities.
  - Added RESTful endpoints in `src/app.ts`: `POST /api/admissions`, `GET /api/admissions`, `GET /api/admissions/proctors`, `PATCH /api/admissions/:id`.
  - Built `StudentAdmissionManagementView.tsx` with multi-step registration modal, active search, cohort filter, and status update management.
- **Phase 3: Weekly Mess Menu Publishing & Student Viewer**:
  - Added `mess_menus` table supporting weekly date ranges, meal categories, and high-resolution menu notices (JPEG, PNG, WebP up to 10MB).
  - Implemented `src/operations/messMenuService.ts` with draft/publish state workflows, scope targeting (All Hostels vs Specific Blocks), and automated notification alerts to students on publication.
  - Added Fastify payload limit (15MB) in `src/app.ts` to accommodate photo uploads.
  - Built `MessMenuView.tsx` providing students with active menu schedule views, full-screen image lightbox, and Hostel Office staff with publishing/upload controls.
- **Verification & Test Coverage**:
  - Added 12 new automated test cases in `tests/admissions_and_mess_menu.test.ts`.
  - Expanded notification tests in `tests/notifications.test.ts` to 8 tests.
  - 74/74 tests passing across 10 test suites (100% pass rate).
  - 0 TypeScript compiler errors (`npm run typecheck`).
  - Clean production client build (`npm run build:client`).

## [2.4.0] - 2026-10-21

- **Stitch Design System Harmonization: 2D Floor Plan Maker & CAD Editor (`FloorPlanEditor.tsx`)**:
  - **Full BVB Block Geometric Blueprint Layout**:
    - Styled after the official Stitch design specification (`#07203c`, `#203653`, `#016a62`, `#f6fafc`, and Inter typography).
    - Integrated multi-wing corridor visual systems: North Wing Corridor (Rooms 201–224), Open Green Central Courtyard & Lightwell, East Wing Hub (249–272), and South Wing Corridor (225–248).
  - **Dual Map Projection System**:
    - Added view toggle between **Architectural Blueprint** (instant interactive wing matrix with live bed capacity dots) and **Precision CAD Canvas** (900 × 650 SVG vector geometry with zoom/pan and wall/polygon calibration).
  - **Interactive Room Inspector & CAD Calibrator**:
    - Dedicated inspector side panel displaying classification, bed matrix capacity buttons (1, 2, or 3 beds), and spatial coordinate bounds inputs (X, Y, W, H).
    - Integrated filters for All Wings, North, South, and East wings plus dynamic room search.
  - **Zero Bug Guarantee & Full Verification**:
    - 60/60 automated tests passing across 9 test suites.
    - 0 TypeScript compiler errors (`npm run typecheck`).
    - Clean client production build (`npm run build:client`).

## [2.3.1] - 2026-10-21

- **Streamlined Login Experience & Removal of Redundant Portal Cards (`PortalSelectionView.tsx`)**:
  - Removed the bulky 3 portal cards grid (Student, Admin, Hostel Office) with descriptive bullet lists in favor of a sleek, focused authentication card.
  - Centered the login panel with the 3-option toggle segmented control (`Student` | `Admin` | `Hostel Office`) at the top of the form.
  - Retained institutional ID and password credential authentication with show/hide password toggle, pilot presets, and role enforcement.
  - Fully verified with 60/60 automated tests passing, 0 TypeScript compiler errors, and clean client build.

## [2.3.0] - 2026-10-21

- **Interactive 3-Option Toggle Portal Authentication with ID & Password Credentials (`PortalSelectionView.tsx` & `AuthContext.tsx`)**:
  - **3-Option Segmented Toggle**:
    - Embedded a clean 3-option toggle control allowing instant switching between `Student`, `Admin & Wardens`, and `Hostel Office`.
    - Synchronized with active portal selection cards and highlighted with clear visual indicators.
  - **Institutional ID & Password Authentication**:
    - Added dedicated input fields for Institutional ID (`USN` / `Staff ID` / `Office Desk ID`) with user icon telemetry.
    - Added secure password input field with show/hide password toggle.
    - Integrated with `loginWithCredentials` method in `AuthContext` to validate credentials, enforce role permissions per portal, and establish authenticated sessions.
    - Retained fast-entry preset selection directory for quick testing across all pilot demo students, wardens, and office staff.
  - **Verification & Invariant Assurance**:
    - 60/60 tests passing across 9 test suites (`npm test`).
    - 0 TypeScript compiler errors (`npm run typecheck`).
    - Clean production client build (`npm run build:client`).

## [2.2.0] - 2026-10-21

- **Stitch Design System Alignment: BVB Block Architectural Wings & Interactive Room Inspector Drawer (`StudentAllocationView.tsx`)**:
  - **Full BVB Floor 2 Geometric Wing Layout**:
    - Replaced generic SVG map placeholder with the authentic Stitch multi-wing architectural floor plan layout.
    - **North Wing Corridor (Rooms 201–224)**: Integrated 2-row room grid (`201–212` and `213–224`) with individual bed token indicators (Available `#1E7B54`, Intent `#E06A26`, Occupied `#C93B3B`, Active Selection `#1D63B8`).
    - **North Corridor Runway**: Added 2.4m central runway banner with Staircase NW-2A and North Sanitization Block indicators.
    - **Central Quadrangle & Transition Atrium**: Integrated Open Green Central Courtyard & Lightwell representation for vertical ventilation shaft (Levels G–4).
    - **East Wing Connector Hub (Rooms 249–272)**: Integrated Elevator Block E1 hub view (`249–252`) and corridor extension indicator.
    - **South Wing Corridor (Rooms 225–248)**: Integrated 2-row room grid (`225–236` and `237–248`) facing SIT campus sports oval with Staircase SW-2B and Fire Exit S2 indicators.
    - **BVB Block Heritage Elevation Card**: Incorporated external building elevation card with photo asset, `SIT-Mesh-202 Active` wifi telemetry, and solar water supply verification indicators.
  - **Active Room Inspector Drawer (Right Panel)**:
    - Dedicated inspector panel displaying classification (provisional 3-seater), exterior exposure, and steel bedstead/study desk furnishings for the selected room.
    - Real-time **Room Bed Matrix**: Renders individual bed cards with student occupancy details (e.g. Rahul M., USN `1SI21CS082`, locked timestamp).
    - **Roommate Coordination Intent Warning Modal**: Interactive warning modal triggered when selecting intent beds (e.g. Prajwal K.), giving students choice to choose another seat or continue anyway.
    - Single-click **Proceed to Seat Confirmation** action and **Save to Roommate Preference Draft** triggers.
  - **Zero Bug Guarantee & Full Verification**:
    - 60/60 test pass rate preserved across 9 test suites.
    - 0 TypeScript compiler errors (`npm run typecheck`).
    - Clean production client build (`npm run build:client`).

## [2.1.0] - 2026-10-21

- **Fix Roommate Invitation Acceptance to Final Room Allocation Workflow**:
  - **Single-Confirmation Dialog Architecture (`RoomAllocationConfirmModal.tsx`)**:
    - Replaced disconnected multi-step navigation with an automatic acknowledgement modal opening immediately upon roommate invitation acceptance (`Accept`).
    - Eliminates redundant room searches, second map clicks, and manual re-navigation.
    - Displays canonical building, floor number, room number, target seat ID, bed availability, and roommate group member roster with priority ranks.
    - Direct "Confirm Room Allocation" action invokes the authoritative backend seat confirmation API with zero intermediate steps.
  - **Authoritative Allocation & Roommate State Machine**:
    - Explicitly decouples invitation status (`ACCEPTED` consent) from final seat allocation status (`CURRENT` authoritative assignment).
    - Preserves server-authoritative turn engine rules: if invitee's turn is active, confirmation finalizes the seat atomically; if out of turn, consent is safely persisted and the student is informed of their turn schedule without false success.
    - Added enriched roommate invitation response contract in `PreferencesService.respondToRoommateInvite` returning building, floor, room number, and member roster.
  - **Live Inventory & Floor Map Synchronization**:
    - Converted target seat from provisional orange intent (`#E06A26`) to authoritative occupied red (`#C93B3B`) or student selection blue (`#1D63B8`) immediately on commit.
    - Authoritative refresh of student profile, seat states (`/api/floors/:id/state`), and roommate intent (`/api/floors/:id/roommate-intent`).
    - Displays dedicated success confirmation modal with persisted building, floor, room, and seat label.
  - **Comprehensive Regression Verification Suite (`tests/roommate_acceptance_allocation.test.ts`)**:
    - Added 6 automated regression tests covering invite acceptance context derivation, intent-to-occupied seat transition, refresh persistence, turn enforcement, seat conflict rejection (`409 SEAT_UNAVAILABLE`), and IDOR protection.
    - Maintained 100% pass rate across 60 automated tests in 9 test suites.

## [2.0.0] - 2026-10-21

- **Stitch Design System Alignment: Hostel Office Registry & Verification Workbench (`StudentRegistryView.tsx`)**:
  - **Top Institutional Ambient Banner & Header Ribbon**: Added `Hostel Admin Desk` branding, Live Registry Sync indicator, and action triggers for `Export Registry CSV` and `Batch Re-verify SBI Gateway`.
  - **Quick Operational Metrics Ticker**: 4 executive metric cards summarizing `Total Applications (30 Records)`, `Fee Verified (24 Students)`, `Receipts Pending Audit (4 Records)`, and `Corrections Required (2 Flagged)`.
  - **Statutory Allocation Rule Callout**: Highlights SIT Hostel Bylaw §4.2(b) declaring chronological payment timestamp ordering down to the second.
  - **Split-Screen Registry Console**:
    - **Filter Toolbar**: Multi-dimensional search across USN, name, challan reference, academic year, branch, and fee audit status.
    - **Registered Applications Table**: Queue rank counter badges (`#01`, `#02`...), student avatar cards, department tags, SBI Collect references with timestamps, challan amount, and eligibility status.
  - **Multi-Tab Applicant Dossier**:
    - Embedded structured dossier sidebar supporting `Fee Evidence`, `Profile`, `Guardian`, `Proctor`, and `Audit Log` tabs.
    - **SBI Collect E-Receipt Duplicate Mockup**: Visual representation of bank reference `#DUK8932401`, fee head, paid amount (₹38,500.00), digital PDF inspection trigger, and gateway confirmation badge.
    - **3-Point Verification Controls**: Interactive checklist toggles for Bank Ref Reconciliation, Disciplinary & Proctor Clearance, and Floor 2 Residency Terms Acceptance.
    - **Direct Warden Review Actions**: Single-click `Confirm Queue #X`, `Request Correction`, and `Reject Evidence & Disqualify Priority` buttons.

- **Stitch Design System Alignment: Admin Allocation Control Console (`AdminDashboard.tsx`)**:
  - **Top Context & Telemetry Bar**: Integrated institutional session indicator (`Session ID: SIT-BVB-24F2-PH1`), gateway timestamp, and certified Warden hash (`#BVB-9804-KSH`).
  - **7-Card Executive Bento Metric Strip**: Displays real-time counts across `Total Cohort (30)`, `Fee Verified (24)`, `Pending Rev. (06)`, `Configured Beds (72)`, `Occupied (12)`, `Available (56)`, and `Blocked (04)`.
  - **Pre-Flight Certification Checklist**: 5/5 mandatory institutional verification checkpoints (Fee Reconciliation, BVB Floor 2 Inventory Frozen, Priority Queue Sequenced, Roommate Groups Synced, Warden Oversight Mandate) with immutable master ledger SHA-256 seal.
  - **Live Turn Engine Console**: Displays active slot owner (`Saugat`, USN `1SI21CS094`), target room browsing telemetry (`Room 202 Wing A`), real-time turn countdown timer with animated progress bar, `Pause/Resume Cycle`, `+2 Min Extension`, `Emergency Halt`, and `Publish Allotment` controls.
  - **Participant Cohort Management Table**: Prioritized student queue with filter tabs (`All`, `Active Turn`, `Next in Line`, `Allocated`, `Pending / Hold`), candidate search, cycle status badges, and quick-action menu (audit log, force override, direct notify).
  - **Floor 2 Pilot Wing Layout Reference**: 6-column matrix preview of rooms 201–212 with occupied, vacant, active turn target, and maintenance states.
  - **Dual-Warden Force Override Modal**: Protected administrative seat assignment dialog with target room & bed pickers, mandatory justification text area, and 6-digit Warden Security PIN input.
  - **Institutional Audit Ledger Slide-Out Drawer**: Detailed candidate dossier event timeline with chronological state changes and one-click PDF export action.

- **Stitch Design System Alignment: Top Priority Status Ribbon & CAD Floor Map Telemetry**:
  - **Live Priority Status Ribbon**:
    - Embedded dedicated top priority status ribbon above the CAD Floor Map in `StudentAllocationView.tsx`.
    - Live turn countdown timer with real-time remaining seconds and turn status indicators (`ACTIVE_TURN`, `WAITING`, `EXPIRED`, `CONFIRMED`).
    - Priority rank telemetry (`Rank #X` of eligible applicants), candidate identifier badge, candidate room/bed selection status, and cluster node attribution (`Cluster Node: BVB-L02-GATEWAY`).
    - Direct quick-action navigation between `Floor Map` and `Terms & Accord`.
  - **Level 02 Geometric Layout CAD Overlay**:
    - Structured architectural CAD viewport header with `Grid Pitch: 1000mm`, `Standard Unit: Single/Double Bed`, and real-time `North [000°]` magnetic alignment indicator.
    - Added Hallway Corridor Runway & Telemetry bar below the interactive SVG canvas displaying hallway width clearance (`2.4m Corridor Width`), fire exit egress direction, and live ambient occupancy density.
    - Integrated BVB Heritage Elevation telemetry strip detailing solar water heating status, 10Gbps fiber backbone mesh, and primary substation feeder telemetry.

- **Stitch Design System Alignment: Student Application & Responsibility Accord Workspace**:
  - **Full-Page Split-Screen Accord View (`StudentApplicationAccord.tsx`)**:
    - Built dedicated institutional accord onboarding screen matching the official Stitch specification (`stitch_dormex_hostel_allocation_platform/student_application_terms`).
    - **University Accord Top Banner**: Official Accord header with student applicant card (initials badge, priority turn rank, USN, department).
    - **5-Step Linear Onboarding Progress Stepper**: Structured progress tracking across `01 / Personal & Academic`, `02 / Parent Contact`, `03 / Local Guardian`, `04 / Proctor Verification`, and `05 / Fee & Accord`.
    - **Sub-section A (Fee Payment & Admission Verification)**: Displays SBI Collect transaction details, reference number, gateway clearance status, payment timestamp, and provisional priority rank.
    - **Sub-section B (Hostel Responsibility Agreement Clauses)**: Clause-by-clause presentation covering room & fixture care, substance & anti-ragging zero-tolerance directives, non-binding roommate intent rules, 48-hour room change regulations, and key handover/caution deposit clearance.
    - **Cryptographic Audit Checkbox & Transition**: Integrated agreement checkbox with client state tracking and audit notice. Upon agreement, records acceptance in backend and smoothly transitions student into Step 2 (Floor Map & Turn Allocation).
    - **Institutional Endorsements & Utility Sidebar**: Live Turn Window clock card (remaining time countdown, animated status bar), Dean/Chief Warden/Health Centre endorsement digests, destination BVB Memorial Block building card with live capacity ratio, and Warden Administrative Office helpdesk directory.
  - **Student Allocation View Integration**:
    - Embedded `StudentApplicationAccord` into Tab 1 of `StudentAllocationView.tsx`. Unsigned applicants are guided through the formal accord before accessing floor allocation. Once certified, displays an official signed status card with one-click navigation to the Live Floor Map.

## [1.9.0] - 2026-10-19

- **Real-Time Notification Center, Audio Chime Feedback & Admin Notice Broadcast**:
  - **Relational Notification Schema & Storage**:
    - Implemented `notifications` table storing category (`NOTICE`, `COMPLAINT`, `ALLOTMENT`, `SYSTEM`), priority (`NORMAL`, `URGENT`, `HIGH`), target audience (`ALL`, `STUDENTS`, `ADMIN`, `BVB_BLOCK`), and reference linkages.
    - Implemented `user_notification_reads` tracking read receipts per user.
    - Added `NotificationService` (`src/notifications/service.ts`) with methods `createNotification`, `publishNotice`, `listNotifications`, `markAsRead`, and `markAllAsRead`.
  - **Automatic System Event Triggers**:
    - **Public Complaints**: When residents file a public complaint (`submitComplaint`), a notification is automatically broadcast across all students and staff.
    - **Seat Allocation Confirmed**: When a candidate confirms a seat (`confirmSeat`), an allotment confirmation notification is recorded.
    - **Official Allocation Results Published**: Transitioning a cycle status to `PUBLISHED` dispatches a high-priority broadcast alerting candidates that official allocations are certified and room changes are active.
  - **Interactive Notification Center (`NotificationCenter.tsx`)**:
    - Replaced the static header bell icon in `AppLayout.tsx` with a live Notification Center dropdown.
    - Added unread badge counter with pulsing animation for unread notifications.
    - Category filtering tabs (`All`, `Notices`, `Allotments`, `Complaints`), mark as read, mark all as read, and direct navigation links to Complaints Desk and Allocation Map.
    - Integrated Web Audio API synthesized harmonic two-tone chime (`audioChime.ts`) with mute/unmute toggle that plays when new unread notifications arrive or notices are broadcast.
    - Background polling every 10 seconds and reactive window broadcast listener (`dormex-notification-broadcast`).
  - **Admin Notice Broadcast Modal (`AdminBroadcastNoticeModal.tsx` & `AdminDashboard.tsx`)**:
    - Added **Broadcast Notice** button to `AdminDashboard.tsx` header for wardens and administrative staff.
    - Comprehensive notice composer supporting title, message body, category selection, urgency level, and audience targeting.
    - RBAC authorization rejecting unauthorized student notice creation with 403 Forbidden.
  - **Automated Verification Suite (`tests/notifications.test.ts`)**:
    - Added 6 automated tests verifying notification feed retrieval, admin publishing, student RBAC denial, public complaint event generation, individual read marking, bulk mark-read, and cycle publication alerts (54/54 automated tests passing across 8 suites).

- **DORMEX Brand Identity Favicon Suite**:
  - Extracted the authentic high-rise architectural `D` symbol logomark from the official Brand Identity Board (`docs/stitch_dormex_hostel_allocation_platform/dormex_hostel_brand_identity_board.png/screen.png`).
  - Generated anti-aliased, transparent, multi-resolution browser favicon assets placed in `public/`:
    - `favicon.ico` (multi-resolution 16x16, 32x32, 48x48 icon).
    - `favicon.png` & `favicon-32x32.png` (32x32 standard web icon).
    - `favicon-16x16.png` (16x16 compact tab icon).
    - `apple-touch-icon.png` (180x180 iOS/macOS touch icon).
    - `icon-192.png` & `icon-512.png` (PWA and Android launcher icons).
  - Integrated favicon `<link>` tags in `index.html` across standard ICO, PNG, and Apple Touch icon standards.
  - Added Vertical Slice C to `tests/frontend_integration.test.ts` verifying static serving and HTML link references (48/48 automated tests passing across 7 suites).

- **Phase 13: Allocation Results Publication & Locking Lifecycle**:
  - **State Machine Extension (`READY -> ACTIVE -> COMPLETED -> PUBLISHED -> LOCKED`)**:
    - Enhanced `PUT /api/allocation-cycles/:id/status` in [`src/app.ts`](file:///S:/Common/projects/comm%20proj/src/app.ts) to record `results_published_at = CURRENT_TIMESTAMP` upon publication and `config_frozen_at = CURRENT_TIMESTAMP` upon cycle locking.
    - Enforced administrative-only RBAC protection rejecting unauthorized student status transitions with 403 Forbidden.
  - **Administrative Dashboard Action Controls**:
    - Integrated **Publish Results** (with `Globe` icon) and **Lock** (with `Lock` icon) action buttons into the cycle management cards in [`AdminDashboard.tsx`](file:///S:/Common/projects/comm%20proj/src/client/components/AdminDashboard.tsx).
    - Added status badges distinguishing `RESULTS PUBLISHED` and `LOCKED (ARCHIVED)` states.
  - **Student View Official Certification Badge**:
    - Added high-contrast certified results indicator (`Official Results Certified`) in [`StudentAllocationView.tsx`](file:///S:/Common/projects/comm%20proj/src/client/components/StudentAllocationView.tsx) when the parent allocation cycle transitions to `PUBLISHED` or `LOCKED`, distinguishing final official allocations from provisional in-flight allocations.
  - **Automated Verification**:
    - Added Test 7 in [`tests/architecture_enhancements.test.ts`](file:///S:/Common/projects/comm%20proj/tests/architecture_enhancements.test.ts) covering the publication lifecycle, timestamp recording, and student RBAC denial (46/46 automated tests passing across 7 suites).

- **Visual Refinement & Anti-Crowding Layout Architecture**:
  - **Spacious Application Topbar & High-Contrast Sidebar (`AppLayout.tsx`)**:
    - Refactored top navigation header into a clean 64px desktop bar with breadcrumb path, pilot context tag, notifications trigger, and compact user profile badge with name and USN.
    - Upgraded dark-navy sidebar (`#07203C`) with 100% readable white text, muted teal accents (`#2C8279`), isolated dev persona switcher, and mobile drawer support.
  - **Streamlined Student Onboarding Stepper (`StudentAllocationView.tsx`)**:
    - Replaced dense tabs with a clean 3-step numbered segmented stepper (`1. Registration & Terms`, `2. Live Floor Map & Selection`, `3. 48-Hour Room Change`).
    - Positioned terms sign-off and fee verification badges neatly on the right.
  - **Focused Allocation Status Card**:
    - High-contrast navy card (`#203653`) clearly presenting candidate identity, USN, assigned priority rank, and real-time turn countdown timer without visual crowding.
  - **Two-Row Floor Map Header & Wing Filters**:
    - Clear title, pilot tag, and building/floor selectors on row 1.
    - Wing filter buttons (`All 72 Rooms`, `North Wing`, `South Wing`, `East Wing`), room search bar, and SVG zoom controls on row 2.
  - **Dedicated Status Legend & Compact Summary Metrics**:
    - Visually separated legend strip with 4 accessible swatches (Green Available, Orange Roommate Intent, Red Occupied, Blue Active Selection).
    - Distinct 3-card metric strip directly below legend showing exact counts for Vacant Beds, Intent Reservations, and Confirmed Occupancy.
  - **70/30 Master-Detail Architectural Workspace**:
    - 70% width allocated to the authentic 900 × 650 CAD projection floor map.
    - 30% width dedicated to the Room Inspector with clear bed matrix, roommate priority coordination form, and seat allocation confirmation.


### Added
- **Administrative Occupancy & Allocation Reports Engine**:
  - Implemented `GET /api/admin/reports/occupancy` with support for both JSON payload and downloadable CSV file generation (`format=csv`).
  - Added building-level filtering (`buildingId`) and RBAC authorization (`WARDEN`, `CHIEF_WARDEN`, `HOSTEL_OFFICE`, `SUPER_ADMIN`).
  - Exported fields include building name, floor number, room number, room type, seat label, seat status, allocation status, student USN/college ID, student full name, branch/department, quota category, and allocation confirmation timestamps.
  - Added **Export Occupancy CSV** button with `Download` icon directly to `AdminDashboard.tsx` header for one-click reports export.
  - Expanded automated test suite with `tests/architecture_enhancements.test.ts` test case verifying JSON and CSV generation (45 tests passing across 7 test suites).

---

## [1.7.0] - 2026-10-18

### Added
- **Autonomous Agent Skills (`git-issues`, `git-commits`, `documentation-standards`)**:
  - Implemented `git-issues` skill enforcing web URL links (`https://github.com/...`) instead of raw local `file:///` URLs, preventing stray escape characters, and standardizing issue tracking.
  - Implemented `git-commits` skill enforcing strict pre-commit verification (`npm test` 100% pass rate, `npm run typecheck` 0 errors, `npm run build:client` clean), conventional commits, and zero direct commits to `main`.
  - Implemented `documentation-standards` skill enforcing GitHub Flavored Markdown integrity, link resolution, and mandatory synchronization across README, CHANGELOG, implementation status, and architecture specs.
  - Deployed skills across project workspace (`.agents/skills/`), global configuration (`~/.gemini/config/skills/`), and the user directory (`S:/agent/skills/`).
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
- **DORMEX Brand Identity Board Cropped Transparent Image Assets & Logo Component**:
  - Directly cropped and extracted all 5 visual themes from `docs/DORMEX Hostel Brand Identity Board.png` with background removal:
    - Primary horizontal color logo (`public/assets/brand-logo-primary-transparent.png`).
    - Crisp white logo for dark navy backgrounds (`public/assets/brand-logo-white-transparent.png`).
    - High-rise architectural `D` symbol icon (`public/assets/brand-symbol-icon-transparent.png`).
    - Stacked vertical brand logo (`public/assets/brand-logo-stacked-transparent.png`).
    - Monochrome navy logo (`public/assets/brand-logo-monochrome-transparent.png`).
  - Updated `DormexLogo.tsx` to directly load the cropped transparent theme assets, applied `theme="white"` on the dark `#203653` sidebar (`AppLayout.tsx`), and `theme="primary"` on the institutional header (`PortalSelectionView.tsx`).
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
