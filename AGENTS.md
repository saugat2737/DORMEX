# AGENTS.MD — Development, Documentation & Commit Protocol

Welcome to **DORMEX**. This document is a strict, binding guide for all autonomous agents and developers contributing to this codebase.

---

## 1. Golden Rules of Contribution

1. **Never Commit or Push Directly to `main`**:
   - The `main` branch is production-frozen.
   - All work must be conducted on designated feature branches (e.g., `panfam`).
   - Merges to `main` must occur exclusively via reviewed Pull Requests or explicit maintainer approvals.

2. **Documentation is Completely Unavoidable**:
   - Before **any** commit is created, documentation **must** be checked and updated.
   - If an API changes, update [`README.md`](./README.md) and [`docs/features.md`](./docs/features.md) / [`docs/system_design.md`](./docs/system_design.md).
   - If a workflow or rule changes, update [`docs/workflow.md`](./docs/workflow.md) and [`docs/rules.md`](./docs/rules.md).
   - Milestone progress **must** be recorded in [`docs/implementation-status.md`](./docs/implementation-status.md).
   - Every single meaningful change **must** be logged in [`CHANGELOG.md`](./CHANGELOG.md).

3. **Verification Before Every Commit**:
   - Automated tests must run and achieve a 100% pass rate: `npm test`.
   - TypeScript must pass without type errors: `npm run typecheck`.
   - Client build must succeed cleanly: `npm run build:client`.

4. **Issue Tracking & Reporting**:
   - Maintain GitHub tracking issues or Pull Requests referencing the committed work under the active branch so team members can review diffs and merge confidently.

---

## 2. Commit Message Style (Conventional Commits)

We enforce standard **Conventional Commits**:

```text
<type>(<scope>): <short imperative description>

[optional body explaining rationale and non-obvious details]

[optional footer(s)]
```

### Allowed Types:
- `feat`: A new feature (e.g. `feat(allocation): add immediate turn advance on confirm`)
- `fix`: A bug fix (e.g. `fix(db): handle idle client errors in pg pool`)
- `docs`: Documentation updates only (e.g. `docs(status): document phase 5 postgres hardening`)
- `test`: Adding or updating test cases (e.g. `test(disjoint): add pool inventory conflict test`)
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance optimizations
- `chore`: Build tasks, package updates, configuration adjustments

---

## 3. Pre-Commit Checklist for Agents

Before running `git commit`, execute this exact mental checklist:

```text
[ ] 1. Did I modify or add backend/frontend features or invariants?
[ ] 2. Did I update CHANGELOG.md with clear bullet points under the active version?
[ ] 3. Did I update docs/implementation-status.md with the completed phase / details?
[ ] 4. Did I verify all automated tests with `npm test`?
[ ] 5. Did I run `npm run typecheck` to ensure 0 TypeScript errors?
[ ] 6. Am I on the correct non-main branch (e.g. `panfam`)?
[ ] 7. Commit with conventional commit message.
[ ] 8. Push only to origin/<branch>.
```

---

## 4. Architectural Boundaries

- **Modular Monolith**: Respect domain boundaries:
  - `src/auth`: Policy and authorization (`can(actor, action, resource)`).
  - `src/allocation`: Server-authoritative turn scheduling and seat confirmation transactions.
  - `src/student`: Registry, profiles, and eligibility verification.
  - `src/inventory`: Buildings, floors, SVG maps, room definitions, and seats.
  - `src/preferences`: Room wishlists and one-hop recommendation invites.
  - `src/operations`: Complaints desk and 48-hour room change requests.
  - `src/db`: Relational PostgreSQL schema migrations, pool connection management, and seed data.
- **Client Clocks are Untrusted**: Never trust client timestamps or client-supplied priorities for turns, expirations, or eligibility.
- **Relational Source of Truth**: All invariants must be backed by PostgreSQL relational constraints and partial unique indexes.
