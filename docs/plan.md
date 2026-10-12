# College Hostel Allocation System — Implementation Plan

## Phase 0 — Freeze domain behavior
Freeze roles, scopes, registration, priority, allocation cycles, waiting threshold, booking duration, late policy, wishlist, recommendation, complaints, room change and publication.

`rules.md` is the behavioral source of truth.

## Phase 1 — Repository
Create modular backend and role-specific frontend areas. Keep domains separate even though deployment is a modular monolith.

## Phase 2 — Database
Build users, roles, scopes, students, academic years, quotas, eligibility groups, priorities, buildings, floors, rooms and seats. Add foreign keys, uniqueness, constraints and indexes.

## Phase 3 — Authentication/authorization
Implement login/session handling, roles, scopes and object-level authorization. Test:
- student cannot admin;
- proctor cannot act as warden;
- warden cannot access another building;
- chief warden can access all;
- Super Admin can force override.

## Phase 4 — Inventory
Implement Building → Floor → Room → Seat. Add capacity, maintenance, blocked state, eligibility and map metadata.

## Phase 5 — Registration
Implement Hostel Office verification and assignment of year/quota/eligibility/priority. Audit every authoritative change.

## Phase 6 — Allocation cycles
Implement cycle/pool creation, eligible participants, eligible inventory, priority ordering, booking duration, threshold, late policy and publication policy. Version/snapshot rules.

## Phase 7 — Waiting room
Implement scheduled opening, join, eligibility checks, 45+ threshold, priority ordering, live position and late insertion.

## Phase 8 — Booking session
Implement ACTIVE/PENDING/CONFIRMED/EXPIRED/CANCELLED sessions with server `started_at` and `expires_at`.

## Phase 9 — Atomic allocation
This is the first critical concurrency milestone.

Test:
1. normal confirmation;
2. two users racing for the same seat;
3. expired turn;
4. wrong turn owner;
5. ineligible seat;
6. duplicate allocation.

Expected same-seat race result: exactly one success.

## Phase 10 — Wishlist
Implement:
- multiple seats;
- selected-room-only rule;
- no reservation;
- target priority;
- invalidation.

Test:
```text
7 confirms A
7 wishlists B,C
8 confirms B
```
Expected:
```text
A = 7
B = 8
C = available + existing valid wishlist state
B's old wishlist/target/recommendation = invalid
```

## Phase 11 — Recommendation
Implement one recommendation per seat, immediate accept/reject, no reservation and automatic invalidation.

Test:
```text
7 → 20 → B
20 accepts
8 → B
```
Expected:
```text
B = 8
recommendation = invalid
```

Also test:
```text
7 → 20 → B
20 accepts
B survives
20's turn
20 chooses C
```
Expected:
```text
recommendation = declined/obsolete
20 = C
```

## Phase 12 — Allocation UI
Build:
```text
Waiting Room
→ Your Turn
→ Building/Floor
→ Room
→ Seat
→ Confirm
```
Clearly communicate that wishlist is a preference, not a reservation.

## Phase 13 — Read models
Implement student dashboard, room/building occupancy and proctor projections. Measure query performance and keep source tables authoritative.

## Phase 14 — Complaints
Implement public complaint workflow first, then private room complaint with roommate verification. Test access boundaries carefully.

## Phase 15 — Room change
Implement configurable enable/disable, eligibility, approval, atomic move, audit and notification.

## Phase 16 — Administration
Build user management, priority, inventory, cycles, publication, complaints and allocation management. Build Super Admin override separately.

## Phase 17 — Audit
Ensure allocation, priority, eligibility, role/scope, room-change, override, complaint and configuration mutations are recorded.

## Phase 18 — Notifications
Use outbox/background processing. Prioritize turn, recommendation, allocation, publication and complaint notifications.

## Phase 19 — Security testing
Test IDOR, privilege escalation, modified priority, modified IDs, modified expiry, replayed requests, stale sessions, unauthorized publication, override bypass and private complaint leakage.

## Phase 20 — Performance testing
Test current scale:
```text
4 buildings × 1,000+ seats
```
Then synthetic larger inventory. Measure:
- dashboard latency;
- map loading;
- occupancy;
- waiting-room joins;
- turn transitions;
- seat confirmation;
- admin searches.

## Phase 21 — Failure testing
Test database/application restart, browser refresh, duplicate requests, network loss, seat conflicts, notification-worker failure and projection failure.

The source-of-truth database must remain correct if derived systems fail.

## Phase 22 — Deployment
Initial target:
```text
Reverse Proxy
  ↓
Backend
  ↓
Database
  ↓
Backup
```

Only add infrastructure after measurement.

## Phase 23 — Documentation discipline

Maintain:
- `architecture.md`
- `plan.md`
- `rules.md`
- `workflow.md`
- `features.md`
- `system_design.md`

When behavior changes, update `rules.md` first, then propagate to the other documents.

## Phase 24 — Definition of Done

```text
✓ staff registration
✓ eligibility and priority
✓ waiting room
✓ 45+ threshold
✓ priority ordering
✓ late arrival policy
✓ active booking lease
✓ server timer
✓ seat map
✓ eligible-seat filtering
✓ atomic allocation
✓ wishlist
✓ targeted wishlist
✓ higher-priority takeover
✓ one-hop recommendation
✓ immediate accept/reject
✓ recommendation invalidation
✓ no chains
✓ occupancy
✓ publication control
✓ audit
✓ role scopes
✓ Super Admin override
✓ public complaints
✓ private complaints
✓ room-change switch
✓ security tests
✓ concurrency tests
✓ performance tests
✓ backup/recovery test
```
