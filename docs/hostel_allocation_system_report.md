# Hostel Allocation System — Design & Build Report

Based on the six project docs (`rules`, `architecture`, `system_design`, `workflow`, `features`, `plan`) plus the new requirements: hardened security, admin-customisable, student privacy, a floor plan maker, and a fast, load-balanceable base.

---

## 1. Verdict on the existing docs

**Keep as-is** (these are strong): modular monolith, relational source of truth with derived read models, backend-authoritative rules, seat as allocation unit, one-hop recommendations, server-side timers, outbox for notifications, domain-specific API verbs, the security test list.

**Change or decide** (details below): 

1. The "one active turn per pool" rule makes **wall-clock time**, not server load, your real bottleneck (§4).
2. Targeted wishlist by *priority number* and recommendations by *student* conflict with your new "students aren't visible to each other" rule (§3).
3. Database is left open as "PostgreSQL/MySQL". **Pick PostgreSQL.** Your invariants rely on partial unique indexes, which MySQL lacks.
4. "Seat → OCCUPIED" appears as stored state *and* "occupancy is derived from seat state". That is two sources of truth. Derive availability from `allocations` only (§5).
5. The late-arrival numbers don't reconcile as written (§4.3).
6. "Add Redis only if measured" is wrong once you run more than one app node: live push needs shared fan-out (§2).

---

## 2. Architecture for speed and load balancing

Real load here is modest: ~4,000+ seats, a few thousand students, one write per ~minute per pool. The danger is not write volume. It is **thousands of browsers opening the waiting room at the same second** and re-polling the map. So the design optimises reads and fan-out.

```
Browsers
   |  HTTPS / HTTP2
CDN or Caddy/Nginx  -- static app, immutable map geometry, 1s micro-cache for status
   |
Load balancer (round-robin, no sticky sessions)
   |
App nodes x N  (stateless; identical)
   |         \
   |          Realtime push (SSE) <-- Postgres LISTEN/NOTIFY, Redis pub/sub when N>1 and measured
   |
PostgreSQL primary  (+ optional read replica for dashboards/reports)
   |
Worker process (outbox -> notifications, projections, turn-advance job)
```

Rules that make it balanceable:

- **Stateless nodes.** Sessions in DB (or signed cookie + DB revocation list). No in-memory queue or timer anywhere.
- **Turn state lives in the DB** (`booking_sessions.expires_at`). Any node can expire and advance a turn: a job picks the row with `FOR UPDATE SKIP LOCKED`, and every confirm request also checks expiry itself ("lazy expiry"). A crashed node never freezes a turn.
- **SSE, not polling.** One `/events` stream per student sends tiny messages ("your turn", "seat 4B taken"). Fall back to 5–10 s polling for networks that break SSE. Do not use WebSockets unless you need client→server streaming; you don't.
- **Map = static geometry + tiny dynamic state.** Geometry is cached forever by version hash. Live state per floor is a compact array of seat codes (~250 bytes per floor), served with ETag and a 1 s micro-cache. This is what keeps 3,000 students on one map cheap.
- **Reads vs writes.** Dashboards, occupancy, proctor views come from projections. Allocation transactions touch only a handful of rows.
- **Language choice:** the DB design dominates speed here, not the language. Use what you can maintain and test well (TypeScript/Fastify shares types with the map editor; Go or Rust/Axum are fine if you're faster in them). Don't choose Rust only for speed.
- **Connection pooling** (PgBouncer, transaction mode) before adding nodes. Postgres connections run out before CPU does.

---

## 3. Visibility and privacy model

Principle: **students are fully transparent upward, opaque sideways.**

| Viewer | Sees |
|---|---|
| Student | Own profile, priority, status, own allocation (per publication), eligible seats, notifications, **their roommates (after publication)**, and the **same-year room view** below |
| Proctor | Assigned students only; year, building, room, seat. No allocation actions |
| Warden | Everything for assigned building(s) |
| Chief Warden | Everything, all buildings |
| Hostel Office | Registration, eligibility, priority, allocation admin, complaints |
| Super Admin | All, plus forced override (reason mandatory, before/after audited) |

**Same-year room view (your rule):** a student can list *room numbers that contain same-year occupants*, optionally with a count. No names, no seat letters, no priority, no branch. Make this configurable per cycle: `OFF | AFTER_OWN_CONFIRM | LIVE`. Never compute it in the browser; the API returns only the permitted projection (`peer_room_projection(year, room_id, count)`).

**Leaks you need to close:**

- **Priority numbers are identifiers.** If student 7 can target "Priority 20", then 20's number is not private. Fix: drop *target-by-priority*. Targeting happens only through a recommendation/invite (below), and priority stays visible only to its owner.
- **Recommendations need a way to address a person.** Use a short one-time **invite code** or exact college ID, rate-limited, returning only "invite sent" regardless of whether the ID exists. This blocks enumeration of who is in the hostel pool.
- **Live allocation inherently shows taken seats.** "Hidden until published" must mean *identities and final lists* are hidden. Seat-taken state is not. Say that explicitly in the rules.
- **Public complaints:** author visible to staff only, votes counted with `UNIQUE(complaint_id, student_id)`, voter identities never exposed to peers.
- **Small-cohort inference:** if a year has very few students in a room, "room + same year" nearly names them. Add an optional minimum-count threshold.
- **Compliance:** this stores student personal data, so apply data minimisation and retention limits in line with India's DPDP Act 2023. Have the college confirm what applies.

Enforce all of this in a single **policy layer** (`can(actor, action, resource)`) plus Postgres row-level security as a second wall for the highest-risk tables (`complaints`, `allocations`). Never in handlers ad hoc.

---

## 4. Allocation engine

### 4.1 The throughput problem

One active turn at a time is correct for fairness and correctness, but look at the clock:

| Students in a pool | Avg time/turn | Total |
|---|---|---|
| 1,000 | 45 s | ~12.5 h |
| 1,000 | 2 min (worst case) | ~33 h |
| 4,000 | 45 s | ~50 h |

Fixes, in order of value:

1. **Advance immediately on confirm** (don't wait out the 2 minutes). Most turns will be short.
2. **Parallel pools with disjoint inventory** (e.g. per year × hostel). Enforce at cycle validation that two pools never share a seat. Otherwise priority order across pools is meaningless.
3. **Pre-pick drafts:** let waiting students shortlist ahead of their turn (wishlist already does this partly) so their turn is one tap.
4. **Auto-confirm option:** a student can pre-set an ordered fallback list; at their turn the server tries it. Still server-side, still atomic.
5. Only if needed: K concurrent turns inside one pool in priority bands. Safe for correctness (the DB resolves conflicts) but weakens strict priority fairness, so make it a visible admin choice.

Add an **escape for the 45-participant threshold**: if a pool has fewer eligible students than the threshold, or nobody reaches it by a deadline, staff can start it manually. Otherwise small quota pools deadlock.

### 4.2 Atomic confirmation

Let the database enforce it, not just your code:

```sql
-- invariants
CREATE UNIQUE INDEX uq_seat_current   ON allocations (cycle_id, seat_id)    WHERE status = 'CURRENT';
CREATE UNIQUE INDEX uq_student_current ON allocations (cycle_id, student_id) WHERE status = 'CURRENT';
CREATE UNIQUE INDEX uq_pool_one_turn  ON booking_sessions (pool_id)         WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX uq_rec_per_seat   ON recommendations (cycle_id, seat_id) WHERE status IN ('CREATED','ACCEPTED');
```

Confirm flow: one transaction; `SELECT … FROM booking_sessions WHERE id=$1 AND student_id=$actor AND status='ACTIVE' AND expires_at > now() FOR UPDATE` using the **DB clock**; check eligibility and seat scope; `INSERT` the allocation and let the unique index decide the race (catch `unique_violation` → `SEAT_UNAVAILABLE`); invalidate preferences and recommendations; write audit and outbox rows; commit. Add an **idempotency key** so a retried tap returns the original result.

Allow a small configurable grace (e.g. 1–2 s) for network latency, and send the server clock offset so the browser countdown is honest.

### 4.3 Late arrivals: making the numbers consistent

The docs say: penalty after ~6 min, max 10 students' worth of passed turns, max wait 22 min. With 2-minute turns, 10 × 2 = 20, so 22 only works as **(10 passed + the student's own turn) × 2 min**. That's probably the intent. Proposed config-driven formula:

```
lateness      = now − student's scheduled turn start       (server clocks)
penalty_turns = 0                                  if lateness ≤ grace (6 min)
              = min(max_penalty_turns (10), ceil((lateness − grace) / turn_len))   otherwise
new_position  = queue_pointer + penalty_turns        -- inserted, not appended
max wait      = (max_penalty_turns + 1) × turn_len   -- 22 min at defaults
```

**Decision needed:** lateness is measured against *their own turn start* or *the cycle start*? The docs don't say. Everything above is parameters in the cycle snapshot (`grace`, `turn_len`, `max_penalty_turns`).

### 4.4 Rules that need tightening

- **Wishlist vs recommendation overlap.** With target-by-priority removed, wishlist = "my own preference if still free", recommendation = "a person I want here". Two clean concepts.
- **What happens when the pool runs out of seats** for remaining students (waitlist, overflow pool, staff manual allocation)? Not defined in `rules.md`.
- **Disconnect mid-turn:** refresh must resume the same session, not forfeit it. The docs imply this; test it.
- **Cycle rule snapshots** are mentioned as "versioned or snapshotted". Make them **immutable once the cycle is READY**; changing rules after means a new cycle version.

---

## 5. Data model changes

Add to `system_design.md`:

- `seats.status` is only `ACTIVE | BLOCKED | MAINTENANCE`. **Availability is derived** from `allocations`. Occupancy counts are projections.
- `floor_maps`, `floor_map_versions` (§6), `map_elements` (optional normalised view).
- `permissions`, `role_permissions`, `role_assignments(user_id, role_id, scope_type, scope_id)` for editable roles (§7).
- `cycle_config_versions(cycle_id, version, config jsonb, created_by, frozen_at)`.
- `feature_flags(key, scope, value)` (room change, peer view mode, publication mode).
- `invites(code_hash, from_student, to_student, seat_id, expires_at)` replacing target-by-priority.
- `idempotency_keys(key, actor, response_hash, created_at)`.
- Audit table: **append-only** (revoke UPDATE/DELETE from the app role), with a hash chain per day if you want tamper evidence.

Index checklist: `waiting_room_entries(cycle_id, status, priority_number)`, `allocations(cycle_id, student_id)`, `seats(room_id)`, `rooms(floor_id)`, `outbox_events(status, id)`, `audit_logs(target_type, target_id, created_at)`.

---

## 6. Floor plan maker

### 6.1 What it must do

Admins draw a building as **Building → Floor → Rooms → Seats** in a 2D editor, with no code changes for new hostels.

**Editor features**

- Grid with snapping, zoom/pan, undo/redo, multi-select, rotate, align.
- Draw **walls, doors, windows, corridors, stairs, lifts, washrooms** (non-allocatable "fixture" elements).
- Draw **rooms** as polygons (rectangle by default) with a room number and metadata (capacity, eligible year/quota, blocked).
- Place **seats/beds** inside a room: rotated rectangles with a label, each bound to a stable `seat_id`.
- **Room templates**: design a "4-bed type A" once, stamp it into 40 rooms. Copy a floor to another floor or building.
- Optional **trace underlay**: upload the college's existing plan image/PDF (admin-only), calibrate scale, draw over it.
- **Live validation**: unique room numbers within a building, seats inside room bounds, no overlapping seats, capacity matches seat count, every floor has an exit/stair (warning only).
- **Draft → Published** versions. Publishing creates an immutable version; editing creates a new draft. Past allocations keep pointing to the version they were made on.

### 6.2 Storage format

Store **structured JSON, never raw SVG** (an admin-uploaded SVG is an XSS vector).

```json
{
  "version": 12, "unit": "cm", "bounds": [0,0,4800,2400],
  "elements": [
    {"t":"wall","pts":[[0,0],[4800,0]]},
    {"t":"door","at":[1200,0],"w":90,"swing":"in"},
    {"t":"room","id":"r_301","label":"301","poly":[[0,0],[600,0],[600,400],[0,400]],"meta":{"year":2}},
    {"t":"seat","id":"s_301A","room":"r_301","pos":[80,60],"size":[90,200],"rot":0,"label":"A"},
    {"t":"fixture","kind":"stairs","poly":[...]}
  ]
}
```

Seat and room IDs map to DB rows. The *geometry* (this JSON) is separate from *state* (availability), so the geometry can be cached forever.

### 6.3 Rendering

- **Viewer (students): SVG** generated from the JSON. Clickable seat shapes, state via CSS classes (`.free .taken .blocked .mine .not-eligible`). SVG scales well on phones and is accessible.
- **Editor (admins): canvas library** (Konva or Fabric) for smooth dragging at hundreds of shapes; export to the JSON above.
- **Delivery:** `GET /maps/{floor_id}/v{hash}.json` with `Cache-Control: immutable`. `GET /floors/{id}/state` returns `[seat_id → code]` as a compact array, ETag'd. A floor of 250 seats is about 1 KB gzipped for both together after first load.
- Student viewer is **building → floor → room → seat**, with only eligible seats selectable. The server re-checks eligibility regardless.
- Mobile: pinch zoom, large tap targets on seats (≥ 44 px effective), room tap opens a bottom sheet.

---

## 7. Admin customisation

Customise with **data and bounded rules**, never admin-written code.

- **Inventory:** buildings, floors, rooms, seats, maps, blocks, room eligibility, all through UI.
- **Cycle config:** start time, pools, years/quotas, threshold, turn length, late policy, publication mode, peer-view mode. Versioned snapshot, with a **SIMULATING** state that dry-runs the queue and shows predicted duration before going live.
- **Priority rules:** declarative (`order_by: [quota_rank, year, registration_no]`, special-case overrides with reason), validated and previewed. No arbitrary expressions evaluated from input.
- **Roles:** fixed *permission catalogue* in code (e.g. `allocation.publish`, `student.edit_priority`), with role→permission mapping editable by Super Admin. Scope (building, assigned students) lives in `role_assignments`.
- **Feature flags:** room change on/off (backend rejects when off, per your rule), complaints modes, peer view.
- **Safety on admin actions:** every change audited; destructive/override actions need a reason; optional second-approver for Super Admin override and publish (config).

---

## 8. Security

| Area | Requirement |
|---|---|
| Authentication | College SSO if available; otherwise email/phone OTP bound to the staff-registered record. **Never USN + DOB** as login (guessable). Argon2id for any passwords. TOTP/passkey mandatory for all staff roles, hardware key preferred for Super Admin |
| Sessions | HttpOnly, Secure, SameSite cookies, rotation on login, server-side revocation, idle + absolute timeouts, one active session per student during a turn |
| CSRF / XSS | CSRF tokens on mutations, strict CSP, no raw HTML/SVG from users, escape complaint text |
| Authorisation | Role + scope + object check on every endpoint via one policy layer; Postgres RLS on complaints/allocations; opaque UUIDs for external IDs (not sequential) |
| Rate limiting | Per user, per IP, per endpoint class: login, join, confirm, invite lookup, complaint post. Tight on invite lookup (enumeration) |
| Input | Schema validation on every payload, parameterised queries only, reject unknown fields (stops mass-assignment of `priority`, `year`) |
| Integrity | DB constraints (§4.2), idempotency keys, append-only audit, backups encrypted |
| Operations | Secrets in env/secret store, least-privilege DB roles (app role cannot DDL or delete audit), dependency scanning, structured logs without personal data, restore test on a schedule |
| Abuse | Detect multi-tab/multi-device joins, bursts of seat taps, and log them |

**Security tests (extends your list):** IDOR on every ID parameter, priority/year/quota in payload ignored, expiry/turn forgery, replayed confirm, two-tab race, proctor→warden escalation, warden cross-building, publication without permission, override without Super Admin, complaint author leak, invite enumeration, peer view returning identities.

---

## 9. Build order (cut for a working product first)

Your 24 phases are complete but too long to be the *first* delivery. Suggested slices:

1. **Foundation:** Postgres schema, auth, roles/scopes, policy layer, audit. *(Phases 2–3, 17)*
2. **Inventory + floor plan maker.** It's the biggest new piece and unblocks everything visual. *(Phase 4 + §6)*
3. **Registration + priority.** *(Phase 5)*
4. **Cycle + waiting room + booking + atomic confirm, with SSE.** Run the 1,000-student simulation here. *(Phases 6–9, 12)*
5. **Publication, occupancy projections, peer-room view, notifications.** *(Phases 13, 18)*
6. **Wishlist + recommendations (invite-based).** *(Phases 10–11)*
7. **Complaints, room change, admin polish.** *(Phases 14–16)*
8. **Hardening: security/failure/load tests, backups, deployment.** *(Phases 19–22)*

Slices 1–5 are a shippable allocation system. Wishlist, recommendations and complaints are valuable but not required to run a fair allocation.

---

## 10. Acceptance targets

Starting numbers to validate against, not promises:

- Same-seat race, 200 concurrent attempts → **exactly 1 winner**, rest get `SEAT_UNAVAILABLE`.
- Seat confirm p95 < 150 ms on a small VPS; waiting-room join p95 < 200 ms.
- 3,000 simultaneous SSE connections on one node, with a turn transition fanned out in < 1 s.
- Map first load < 100 KB total; subsequent state refresh < 2 KB per floor.
- Kill an app node mid-turn → another node resumes, turn not lost.
- Kill the worker → allocations still succeed; notifications catch up from outbox.
- Rebuild all projections from source tables with no data loss.
- Full dry run (SIMULATING) of a 1,000-student pool completes in seconds and reports predicted duration.

---

## 11. Open decisions for you

1. Confirm **PostgreSQL**.
2. Drop **target-by-priority** in favour of invite-based recommendations?
3. Late-arrival **lateness reference point** (own turn start vs cycle start).
4. Peer room view default: `OFF`, `AFTER_OWN_CONFIRM`, or `LIVE`?
5. How are pools split (per year? per hostel?) to hit an acceptable total allocation duration?
6. What happens to students left without a seat?
7. Login method: college SSO available, or OTP?
