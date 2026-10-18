---
name: documentation-standards
description: >-
  Rules and procedures for writing, formatting, and auditing project documentation.
  Enforces clean GitHub Flavored Markdown, proper relative and web links, removal of stray typos
  and empty lines, and mandatory synchronization across README, CHANGELOG, implementation status,
  and architecture specifications.
---

# Documentation Standards & Audit Skill

This skill provides an authoritative checklist and procedure for maintaining clean, high-standard documentation.

## Core Guidelines

1. **Header & Syntax Integrity**:
   - Ensure header markers are properly formatted (`# Title`, never `/# Title`).
   - Strip excessive leading or trailing blank whitespace from markdown files.
   - Use standard GitHub Flavored Markdown (tables, task lists `- [x]`, and alerts `> [!NOTE]`).

2. **Link Formatting Rules**:
   - **Internal Documentation Links**: Use repository-relative links or clean GitHub web links:
     - Relative link: `[Implementation Status](./docs/implementation-status.md)`
     - GitHub web link: `[README](https://github.com/<owner>/<repo>/blob/<branch>/README.md)`
   - **NEVER use local `file:///` URLs** in public-facing documentation, READMEs, changelogs, or external tickets.

3. **Mandatory Documentation Synchronization**:
   Whenever a feature, invariant, endpoint, or tooling change is made:
   - **`README.md`**: Update the system overview, prerequisites, API flow, and feature highlights.
   - **`CHANGELOG.md`**: Add detailed bullet points under the active version conforming to [Keep a Changelog](https://keepachangelog.com/).
   - **`docs/implementation-status.md`**: Check off completed phases, document technical decisions, and record verification metrics.
   - **`docs/features.md` & `docs/system_design.md`**: Keep domain boundary specifications, state machines, and invariants up to date.
   - **`docs/workflow.md`**: Update ASCII or mermaid sequence diagrams to match runtime execution flows.
   - **`docs/rules.md`**: Document business and security invariants.

4. **Self-Auditing Checklist**:
   - [ ] Are all headers valid without stray punctuation?
   - [ ] Are there empty blank line blocks at the start of documents?
   - [ ] Do all links resolve cleanly without raw local file scheme links?
   - [ ] Does `CHANGELOG.md` accurately record the latest changes under the current semver?
   - [ ] Are all code snippets and command lines tested and runnable?
