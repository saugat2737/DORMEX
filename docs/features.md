# College Hostel Allocation System — Features

## User and access
- Student
- Proctor
- Warden
- Chief Warden
- Hostel Office
- Super Admin
- Role + scope authorization
- Object-level access control
- No parent role

## Student registration
- Staff-driven registration
- Eligibility/payment verification
- Academic year
- Quota/category
- Eligibility group
- Priority
- Allocation-cycle eligibility

## Hostel inventory
- Buildings
- Floors
- Rooms
- Seats/beds
- Room capacity
- Occupancy
- Maintenance/block state
- Eligibility restrictions
- Floor maps (SVG rendering & 2D geometry)
- Room maps & Bed inventories (provisional and verified)
- Future buildings without code changes
- Interactive 2D Floor Plan Editor (Hostel Office controllable canvas with SVG template loading, room/seat placement, and geometry inspection)

## Allocation cycles
- Scheduled start
- Allocation pool with disjoint seat inventory guarantee
- Priority configuration (chronological fee payment timestamp with deterministic USN tie-break)
- Year/quota eligibility
- Inventory eligibility
- Waiting threshold
- Booking duration
- Late-arrival policy
- Dry-run cohort simulation (`POST /api/allocation-cycles/:id/simulate`)
- Publication control
- Special cases
- Cycle state: DRAFT/SIMULATING/READY/PUBLISHED/LOCKED

## Waiting room
- Scheduled entry
- 45+ baseline threshold
- Priority ordering
- One active turn
- Live status
- Late-arrival insertion
- Turn expiry
- Notifications

## Live allocation
- Building/floor/room map
- Per-seat availability
- Eligible-seat filtering
- 2-minute default turn
- Server-authoritative timer
- Atomic confirmation
- Race-condition protection
- Immediate allocation

## Wishlist
- Multiple remaining seats
- Same selected room only
- No multi-room wishlist
- Target future priority
- No reservation
- Automatic invalidation
- Higher-priority takeover behavior

## Recommendations
- One recommendation per seat
- One-hop only
- Immediate accept/reject
- Accepted does not reserve
- Seat-taken invalidation
- Declined-by-selection state
- No chains

## Transparency
Students:
- own priority
- own allocation state
- eligible seats
- own final allocation subject to publication
- permitted room/roommate details

Staff:
- occupancy
- assigned students
- complaints
- administrative state

## Complaints
### Public
- Hostel-wide visibility
- Community voting/confirmation
- Staff review
- Assignment
- Resolution
- Closure

### Private
- Room-specific
- Roommate verification
- Escalation
- Assignment
- Resolution
- Closure

## Room change
- Enable/disable
- Eligibility
- Request
- Approval
- Atomic move
- Audit
- Notifications

## Administration
- User management
- Eligibility
- Priority
- Inventory
- Allocation cycles
- Publication
- Complaint management
- Scoped building management
- Super Admin force override

## Audit
Record:
- actor
- timestamp
- action
- target
- before/after
- reason
- cycle
- correlation ID

## Notifications
- Cycle opening
- Waiting room
- Turn start
- Turn expiry
- Recommendation
- Recommendation decision
- Recommendation invalidation
- Allocation confirmation
- Publication
- Complaint updates
- Room-change updates

## Performance
- Indexed SQL
- Read models
- Static map assets
- Pagination
- Controlled allocation concurrency
- Short transactions
- Background jobs
- Compact API payloads

## Security
- Authentication
- Role authorization
- Scope authorization
- Object-level authorization
- Secure sessions
- Rate limiting
- Server-side validation
- Database constraints
- Atomic allocation
- Audit logging
- No client-controlled priority/timer/allocation state

## Testing & Development Tooling
- Virtual Student Dataset Generator (`1si25<branch><code-3>`)
- Formatted console test data tables
- Automated database seeder for load simulation and turn testing
- In-memory PostgreSQL engine (`pg-mem`) and live PostgreSQL server compatibility

## Brand Identity & Design System
- Official brand assets cropped from Brand Identity Board
- 5 multi-theme logo variants (Primary horizontal, White, Stacked, D-Symbol, Monochrome)
- Background removal with transparent alpha channels
- Integrated across portals and layouts

## Future/reporting support
- Occupancy reports
- Allocation reports
- Building/floor reports
- Complaint reports
- Audit reports
- Priority/cycle reports
- Async report generation for expensive exports
