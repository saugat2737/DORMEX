# College Hostel Allocation System — Architecture

## 1. Purpose

A secure, high-performance college hostel platform covering staff-controlled student registration, eligibility and priority, priority-ordered live seat allocation, room maps, wishlist/recommendation coordination, occupancy, complaints, room changes, scoped administration, publication control and auditability.

The current planning scale is 4 buildings with 1,000+ seats each, with additional buildings expected later.

## 2. Core architectural principles

### Modular monolith
Start with one well-structured backend rather than microservices. Separate domains internally so components can later be extracted if real load requires it.

### Source of truth + read models
Use a normalized relational database for authoritative state. Do **not** create one physical table per student. Instead use indexed source tables plus compact denormalized read models such as `student_dashboard_projection`, `building_occupancy_projection`, and `proctor_student_projection`.

### Backend authority
The client is untrusted. Never trust client-supplied priority, quota, eligibility, timer, turn ownership, availability, publication state or administrative scope.

### Transactional allocation
Seat confirmation must be atomic. A race for the same seat must produce exactly one winner.

### Controlled concurrency
Many students may wait, but only one student has an active selection turn within an allocation pool. This is a major load-control mechanism.

## 3. Logical architecture

```text
Browser
  |
HTTPS / Reverse Proxy
  |
Application Backend
  +-- Identity & Access
  +-- Student Registry
  +-- Eligibility & Priority
  +-- Hostel Inventory
  +-- Allocation Cycle
  +-- Waiting Room / Queue
  +-- Booking / Seat Allocation
  +-- Wishlist / Recommendation
  +-- Complaints
  +-- Room Change
  +-- Notifications
  +-- Audit
  +-- Read Models
  |
Relational Database
  |
Backup / Recovery
```

Optional Redis should only be added if measurements justify it for ephemeral state, rate limiting or coordination.

## 4. Domain modules

- Identity and Access
- Student Registry
- Eligibility / Quota / Priority
- Hostel Inventory
- Allocation Configuration
- Waiting Room
- Booking
- Wishlist
- Recommendation
- Occupancy
- Complaints
- Room Change
- Notifications
- Audit
- Read Models

## 5. Inventory hierarchy

```text
Building
  └── Floor
       └── Room
            └── Seat / Bed
```

The **seat** is the allocation unit. A room can therefore be partially occupied.

Room maps are data-driven. Store building/floor/room/seat geometry or logical coordinates and overlay live state in the frontend.

## 6. Allocation architecture

```text
Student registration
      ↓
Eligibility + year + quota + priority
      ↓
Allocation cycle / pool
      ↓
Waiting room
      ↓
Priority queue
      ↓
One active booking turn
      ↓
Eligible room/seat map
      ↓
Confirm own seat
      ├── Wishlist remaining seats in selected room
      └── One-hop recommendations
      ↓
Atomic allocation
      ↓
Occupancy + audit + notifications
```

Default booking duration is 2 minutes and is configurable.

The waiting-room threshold is currently 45+ participants and is configurable.

## 7. Authorization

Authorization is:

```text
Identity + Role + Scope + Resource + Action
```

Examples:
- Proctor → assigned students.
- Warden → assigned building(s).
- Chief Warden → all buildings.
- Hostel Office → authorized registration/allocation administration.
- Super Admin → system-wide authority and forceful override.

Every sensitive endpoint must perform object-level authorization; changing an ID in a request must never grant access.

## 8. Performance

Performance should come from:
- indexed SQL;
- controlled allocation concurrency;
- precomputed read models;
- static map assets;
- short transactions;
- pagination;
- background notifications;
- minimal repeated joins.

Normal dashboards must not recalculate the entire hostel.

## 9. Critical allocation transaction

```text
BEGIN
  verify active turn
  verify server expiry
  verify eligibility
  lock/check requested seat
  verify availability
  create allocation
  invalidate conflicting wishlist/recommendation state
  update derived occupancy state
COMMIT
```

Client timers are display-only.

## 10. Audit

Record actor, timestamp, action, target, before/after state, reason when required, cycle and correlation ID.

Do not silently overwrite allocation history.

## 11. Locked decisions

- No parent role.
- Students do not self-register as valid hostel applicants.
- Students cannot change their own year/quota/category/priority.
- Priority is ascending: lower number = higher priority.
- Seat is the allocation unit.
- Wishlist is never a reservation.
- Wishlist is limited to remaining seats in the student's selected room.
- A student may wishlist multiple seats in that room.
- A wishlist can target a future priority.
- A higher-priority student can take a seat targeted for a lower-priority student.
- Confirming a seat immediately invalidates previous wishlist/target/recommendation state for that seat.
- Recommendations are one-hop only.
- Recommendation responses are immediate accept/reject.
- Acceptance never reserves the seat.
- If the recommended seat is taken, the recommendation is invalidated.
- If the target chooses another seat, the recommendation becomes obsolete/declined-by-selection.
- Students do not need to see other students' wishlist/recommendation identities.
- Super Admin alone can forcefully override normal allocation.
