---
name: git-issues
description: >-
  Standardized protocol and procedure for managing GitHub issues, issue bodies, and comments.
  Enforces using clean web URLs (https://github.com/...) instead of raw local file paths (file:///),
  eliminating stray escape characters, and keeping issue trackers synchronized with branch deliverables.
---

# Git Issues Management Skill

This skill enforces best practices for authoring, updating, and formatting GitHub issues and comments.

## Core Rules

1. **Never Post Local `file:///` URIs to GitHub**:
   - Web users cannot click local `file:///` URLs.
   - Always translate local repository paths to standard GitHub URLs using the active branch:
     - `https://github.com/<owner>/<repo>/blob/<branch>/<path>` (e.g. `https://github.com/saugat2737/DORMEX/blob/panfam/README.md`)
   - For line ranges:
     - `https://github.com/<owner>/<repo>/blob/<branch>/<path>#L10-L25`

2. **Prevent Escape-Character & Corrupt Empty Comments**:
   - When posting via `gh` CLI on Windows (especially PowerShell), do **not** inline multi-line markdown strings with raw quotes or backslashes.
   - **Always write markdown content to a temporary file** (e.g., `.tmp_comment.md`) and pass it using:
     ```bash
     gh issue comment <number> --body-file ".tmp_comment.md"
     # Or for editing:
     gh api -X PATCH repos/<owner>/<repo>/issues/comments/<comment_id> -F body=@.tmp_comment.md
     ```
   - Immediately delete the temporary file after posting.

3. **Check and Clean Up Corrupt Comments**:
   - Inspect comments using:
     ```bash
     gh api repos/<owner>/<repo>/issues/<issue_number>/comments --jq ".[] | {id: .id, body: .body}"
     ```
   - If an empty, stray backslash `\`, or malformed comment exists, delete it immediately:
     ```bash
     gh api -X DELETE repos/<owner>/<repo>/issues/comments/<comment_id>
     ```

4. **Structured Issue Body Standard**:
   A master tracking issue body must include:
   - **Executive Objective**: Branch name and milestone scope.
   - **Component Breakdown**: Numbered headings for key modules, features, or architectural deliverables.
   - **Verification Results**: Passing test counts, TypeScript check status, and build outputs.
   - **Traceable Web Links**: Direct clickable GitHub web links to source code and documentation.
