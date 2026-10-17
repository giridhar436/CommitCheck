# Issue Tracker: Linear

Issues and specs for this repository are tracked in Linear.

## Target Project & Workspace

- **Workspace**: `varun-v-bhat`
- **Project Name**: `CommitCheck`
- **Project Identifier**: `P-VAR-1` (UUID: `26a97d01-fa15-4388-a419-430ab41ad40c`)
- **Project URL**: [https://linear.app/varun-v-bhat/project/commitcheck-da3486290f78/overview](https://linear.app/varun-v-bhat/project/commitcheck-da3486290f78/overview)
- **Team**: `Varun v bhat` (Key: `VAR`, ID: `08b985c8-4b73-470c-92d6-3f0fcdb26cae`)

## Conventions

- All project issues and specifications are created and tracked under the **CommitCheck** project (`P-VAR-1`) in team **VAR**.
- Each major feature or specification correlates to a Linear parent issue or document within this project.
- Tracer-bullet implementation tasks are created as individual Linear issues under team `VAR`, linked to project `P-VAR-1`.
- Dependency edges (blocking / blocked by) are represented using Linear's native issue relations (`Blocked by` / `Blocks`).
- Triage state is reflected through Linear issue statuses and labels (see `docs/agents/triage-labels.md`).

## When a skill says "publish to the issue tracker"

Create issues in Linear via the Linear MCP server, Linear CLI, or present structured markdown for import into Linear.

## When a skill says "fetch the relevant ticket"

Retrieve ticket details using the Linear issue identifier (e.g. `ENG-123`) via Linear MCP/CLI or read details provided in the session context.

## Wayfinding operations

Used by `/wayfinder`:
- **Map**: The parent Linear initiative, epic, or project document summarizing current notes, decisions so far, and remaining fog.
- **Child tickets**: Individual Linear issues with appropriate issue type or tags (`research`, `prototype`, `grilling`, `task`).
- **Blocking**: Native Linear issue relationships (`Blocked by` / `Blocks`).
- **Claim**: Assign issue to agent/user and transition state to `In Progress`.
- **Resolve**: Add summary comment with findings and transition issue state to `Done`.
