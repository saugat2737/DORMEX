# College Hostel Allocation System — Rules

## 1. Roles

### Student
Can view own information, join an authorized allocation cycle, select an eligible seat during their turn, wishlist seats in their selected room, make/receive recommendations, view permitted allocation information, complain and request room changes when enabled.

### Proctor
Transparency for assigned students only; generic student/year/building/room information; no allocation authority.

### Warden
Building-scoped management.

### Chief Warden
All-building management.

### Hostel Office
Student registration, eligibility, year/quota/priority assignment, allocation administration, room/allocation details and complaints.

### Super Admin
System-wide administration and forceful allocation override.

## 2. Registration rules

1. A college student is not automatically a valid hostel applicant.
2. Hostel Office verifies the applicant.
3. Staff assign year, quota/category, eligibility group and priority.
4. Students cannot modify these authoritative fields.
5. Allocation APIs re-check eligibility server-side.

## 3. Priority rules

- Lower number = earlier/higher priority.
- Priority is scoped to the appropriate allocation cycle/pool.
- Different years and quotas may have different priority structures.
- Special cases must be configurable.
- Client-supplied priority is never authoritative.

## 4. Waiting room rules

1. Allocation begins at a configured time.
2. Students enter a waiting room.
3. Current threshold: 45+ participants.
4. Once threshold is reached, eligible participants are ordered by priority.
5. One student has the active selection turn at a time.
6. Default selection duration: 2 minutes.
7. Duration is configurable.
8. Server time is authoritative.
9. Browser countdown is UI only.
10. Only the active turn owner can confirm a seat.

## 5. Late arrivals

The current intended policy is:
- penalty begins after approximately 6 minutes;
- lateness is translated into passed-turn/turn-time penalty;
- maximum 10 students' worth of passed turns is considered;
- maximum resulting wait is 22 minutes;
- the late student is inserted according to the calculated position rather than simply appended.

The exact boundary formula must be configuration-driven.

## 6. Seat rules

- Rooms contain seats/beds.
- Each seat can have at most one current allocation.
- A student can have at most one current allocation per cycle.
- Seat confirmation is atomic.
- Room occupancy is derived from seat state.

## 7. Wishlist rules

Example:

```text
Room 301
A = confirmed by 7
B = wishlisted
C = wishlisted
```

A wishlist means:

> “I prefer this seat if it remains available.”

It does **not** mean:
- reserved;
- held;
- blocked;
- unavailable to other students.

A student may wishlist multiple remaining seats, but only in the room they selected. They cannot wishlist seats across multiple rooms.

## 8. Targeted wishlist

A wishlist may identify an intended future occupant:

```text
Seat B → Priority 20
```

This is still not a reservation.

A higher-priority student may take B. If Priority 8 confirms B while B targets Priority 20, Priority 8 wins immediately.

The system then invalidates the old wishlist, target and recommendation metadata for B.

## 9. Recommendation rules

A recommendation is a one-hop direct relationship:

```text
7 → 20
```

Never:

```text
7 → 20 → 30
```

One recommendation can be attached to each relevant seat.

The target receives an immediate accept/reject decision.

### Accept
The recommendation becomes accepted but the seat remains genuinely available.

### Reject
The recommendation becomes rejected.

### Seat taken
The recommendation is immediately invalidated.

### Target chooses another seat
The recommendation becomes `DECLINED_BY_SELECTION` / obsolete.

### No chaining
The recommended student cannot forward the recommendation.

## 10. Student visibility

Students can see:
- own priority;
- own status;
- eligible available seats;
- own final allocation subject to publication settings;
- permitted roommate/room information;
- notifications.

They do not see internal choices, other students' wishlist identities, recommendation relationships or administrative audit data unless explicitly authorized.

## 11. Publication

Allocation cycles can be configured so final allocations are:
- immediately visible; or
- hidden until staff publish them.

Suggested lifecycle:

```text
DRAFT → SIMULATING → READY → PUBLISHED → LOCKED
```

## 12. Administrative override

Normal authorized changes are allowed within scope.

Forceful override is Super Admin only and requires a reason plus audit history containing before/after state.

## 13. Complaints

### Public
Hostel-wide visibility, community confirmation/voting, staff review, assignment, resolution and closure.

### Private
Room-specific, visible to appropriate room occupants/staff, roommate verification first, escalation only after required verification, then assignment/resolution/closure.

## 14. Room changes

Room change is configurable. When disabled, the backend rejects requests; hiding the button is not sufficient.

## 15. Security invariants

```text
One seat → max one current allocation
One student → max one current allocation per cycle
Active pools in cycle → strictly disjoint seat inventory
Only active turn owner → can confirm
Immediate turn advance → pool advances to next student upon confirm
Expired turn → cannot confirm
Client timer → never authoritative
Client priority → never authoritative
Priority rank → determined chronologically by verified fee timestamp
Student USN → strictly validated institutional format (1si25<branch><code-3>)
Terms of Responsibility → mandatory signed server acknowledgement before waiting room
Wishlist → never reserves
Recommendation → never reserves
Recommendation → never chains
Forced override → Super Admin only
Scope → verified server-side
Eligibility → verified server-side
```
