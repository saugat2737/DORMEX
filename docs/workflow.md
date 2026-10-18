# College Hostel Allocation System — Workflows

## 1. End-to-end student workflow

```text
College Student
  ↓
Hostel Office registration
  ↓
Eligibility verification
  ↓
Year + quota + eligibility + priority
  ↓
Allocation cycle eligibility
  ↓
Waiting room
  ↓
Priority-based turn
  ↓
Map / eligible seats
  ├── Confirm own seat
  ├── Wishlist remaining seats in selected room
  └── Recommend a person for a seat
  ↓
Atomic allocation
  ↓
Occupancy / roommate state
  ↓
Publication
```

## 2. Registration

1. Staff find/register student.
2. Verify hostel eligibility/payment requirements.
3. Assign academic year.
4. Assign quota/category.
5. Assign eligibility group.
6. Assign priority.
7. Student becomes eligible for configured allocation cycles.

## 3. Allocation cycle setup

Staff configure:
- start time;
- allocation pool;
- eligible years/quotas;
- inventory;
- priority rules;
- waiting threshold;
- booking duration;
- late-arrival policy;
- publication policy;
- special cases.

Rules/configuration should be versioned or snapshotted so historical allocations remain explainable.

## 4. Waiting room

```text
Scheduled time
   ↓
Students join
   ↓
Count >= 45?
   ├─ No → continue waiting
   └─ Yes
        ↓
sort eligible waiting students by priority
        ↓
start lowest-numbered priority
```

Only one active selector exists in a pool.

## 5. Active turn

When a turn begins, the server creates a short-lived booking session containing:
- student;
- cycle;
- turn sequence;
- started time;
- expiry time;
- status.

The frontend receives the allowed map and countdown.

When the student confirms a seat, the server validates everything again.

## 6. Normal seat confirmation

```text
Student clicks Seat B
        ↓
authenticate
        ↓
verify turn owner
        ↓
verify not expired
        ↓
verify eligibility
        ↓
verify seat is allowed
        ↓
lock/check seat
        ↓
create allocation
        ↓
invalidate conflicting preference/recommendation records
        ↓
commit
```

## 7. Wishlist

Priority 7 selects A:

```text
A = confirmed
```

Then wishes B and C:

```text
B = available + wishlist
C = available + wishlist
```

No seat is locked.

## 8. Priority-aware targeted wishlist

Priority 7 associates:

```text
B → target Priority 20
```

Priority 8 later sees B as an available seat and may confirm it because 8 has higher priority than 20.

Once 8 confirms:

```text
B = 8
B's old wishlist/target/recommendation metadata = invalid
```

Priority 20 receives no special claim over B.

## 9. Recommendation

```text
7 recommends 20 for B
        ↓
20 receives immediate prompt
        ├── Accept
        └── Reject
```

Accepting only records preference/intent. It does not reserve B.

If B is later confirmed by a higher-priority student:

```text
recommendation → invalidated
```

If B survives and 20's turn arrives:
- choosing B fulfills the recommendation;
- choosing another seat makes the old recommendation obsolete.

No chain is created.

## 10. Late arrival

```text
Late student arrives
       ↓
calculate lateness from server timestamps
       ↓
translate into passed-turn penalty
       ↓
cap at 10 students' worth of time
       ↓
cap wait at 22 minutes
       ↓
insert at calculated position
```

## 11. Turn timeout

```text
ACTIVE
  ↓
server expiry reached
  ↓
EXPIRED
  ↓
turn closes
  ↓
next turn
```

A stale browser cannot resurrect the turn.

## 12. Publication

```text
processing
   ↓
READY
   ├── remain hidden
   └── PUBLISHED
          ↓
        LOCKED
```

Visibility is enforced by the API, not only the UI.

## 13. Public complaint

```text
Student
 ↓
Public complaint
 ↓
Hostel-wide visibility
 ↓
Other students confirm/vote
 ↓
Staff review
 ↓
Assignment
 ↓
Resolution
 ↓
Close
```

## 14. Private complaint

```text
Student
 ↓
Private room complaint
 ↓
Roommate verification
 ↓
Required verification achieved
 ↓
Staff escalation
 ↓
Assignment
 ↓
Resolution
 ↓
Close
```

## 15. Room change

```text
Student request
 ↓
feature enabled?
 ├─ No → reject
 └─ Yes
      ↓
eligibility check
      ↓
approval
      ↓
atomic allocation move
      ↓
audit + notification
```

## 16. Super Admin override

```text
Super Admin
 ↓
select allocation
 ↓
enter reason
 ↓
authorization/scope check
 ↓
atomic change
 ↓
audit before/after
 ↓
update occupancy/read models
 ↓
notify affected users
```

## 17. Dry-Run Cycle Simulation Workflow

```text
Hostel Office / Admin
 ↓
Select Cycle
 ↓
Trigger POST /api/allocation-cycles/:id/simulate
 ↓
Dry-Run Engine Evaluates:
 ├── Total students vs Available beds (Capacity analytics)
 ├── Pool cohort throughput & predicted duration
 ├── Disjoint inventory verification
 └── Overflow / waitlist projections
 ↓
Display Simulation Dashboard (No database mutations)
```

## 18. Hostel Office 2D Floor Plan Designer Workflow

```text
Hostel Office Staff
 ↓
Open Floor Plan Creator
 ↓
Select Building & Floor
 ↓
Option A: Load Official BVB SVG Template (Rooms 201–272)
Option B: Add Custom Rooms & Select Bed Inventory (Single, Double, Triple)
 ↓
Interactive Geometry Inspector:
 ├── Click element (Room / Seat)
 ├── Fine-tune X, Y, Width, Height
 └── Delete or reposition
 ↓
Save & Publish Geometry (`PUT /api/floors/:id/geometry`)
```
