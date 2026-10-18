---
name: git-commits
description: >-
  Strict commit protocol enforcing branch safety, conventional commit messages,
  pre-commit test verification (100% test pass rate, 0 type errors, clean build),
  and atomic commits pushed only to designated feature branches.
---

# Git Commits Protocol Skill

This skill enforces strict pre-commit verification and conventional commit standards.

## Core Rules

1. **Never Commit or Push Directly to `main`**:
   - Always verify the active git branch before committing:
     ```bash
     git branch --show-current
     ```
   - All commits must be made to feature branches (e.g., `panfam`).
   - Merges to `main` occur exclusively via pull requests.

2. **Mandatory Pre-Commit Verification Sequence**:
   Before executing `git commit`, ALL of the following commands must succeed cleanly:
   - **Unit & Integration Tests**: `npm test` (Must achieve 100% pass rate).
   - **TypeScript Typecheck**: `npm run typecheck` (Must complete with 0 errors).
   - **Client Build**: `npm run build:client` (Must produce a clean production bundle).
   If any command fails, do **not** commit. Resolve the error first.

3. **Conventional Commit Message Format**:
   ```text
   <type>(<scope>): <short imperative description>

   [optional body explaining rationale and non-obvious details]
   ```

   **Types**:
   - `feat`: A new user-facing or backend feature.
   - `fix`: A bug fix or invariant correction.
   - `docs`: Documentation updates only.
   - `test`: Adding or refactoring automated tests.
   - `refactor`: Code changes that neither fix a bug nor add a feature.
   - `perf`: Performance optimizations.
   - `chore`: Tooling, configuration, or build adjustments.

4. **Documentation Synchronization**:
   - Synchronize `CHANGELOG.md` under the active version for every user-facing or architectural change.
   - Update `docs/implementation-status.md` when completing phases or acceptance targets.
   - Keep `README.md` and domain specifications aligned.

5. **Safe Push Command**:
   - Always push explicitly to the active upstream branch:
     ```bash
     git push origin <branch>
     ```
   - Never use force pushes (`--force` or `-f`) unless explicitly directed.
