# Spec: CommitCheck - Meeting-to-Code Freelance Verification Platform

> **Linear Issue**: [VAR-5](https://linear.app/varun-v-bhat/issue/VAR-5/spec-commitcheck-meeting-to-code-freelance-verification-platform)  
> **Status**: Backlog (`ready-for-agent`)  
> **Project**: [CommitCheck (P-VAR-1)](https://linear.app/varun-v-bhat/project/commitcheck-da3486290f78/overview)

---

## Problem Statement

Freelance software projects suffer from frequent scope ambiguity, phantom progress updates, and a lack of verifiable proof. Clients often cannot tell whether tasks marked "done" on a project board actually correspond to real committed code in GitHub, while freelancers spend hours manually translating discovery call notes into task boards, writing status emails, and defending against scope creep.

## Solution

CommitCheck bridges discovery meetings, Linear task tracking, and GitHub codebase activity into an automated verification platform:
1. **Role-Enforced Onboarding**: Freelancers sign in with GitHub; Clients sign in with Google.
2. **Automated Scope Extraction**: Freelancers paste a Google Meet URL; an automated bot (Recall.ai) joins, records audio, and transcribes the conversation. Google Gemini 1.5 Pro extracts structured milestones and tasks.
3. **Pre-Publish Scope Review**: Freelancers refine the extracted tasks in a staging view before one-click publishing to their connected Linear workspace.
4. **Instant Stakeholder Notification**: Resend delivers a branded email to both Client and Freelancer with direct Linear links and project summaries.
5. **AI Code Auditing**: Clients click "Verify Progress" at any time. An AI verification agent performs a dual-tier audit (syntactic Linear ticket mapping + semantic LLM git diff evaluation) to generate an executive Audit Dashboard showing verified completion percentages and flagging Ghost Completions.

## User Stories

1. As a Freelancer, I want to authenticate via GitHub OAuth, so that CommitCheck has authorized read access to my repositories.
2. As a Client, I want to authenticate via Google/Gmail OAuth, so that I can sign in with one click without creating a separate password.
3. As a Freelancer, I want to create a new Project and bind it to a specific GitHub repository (`owner/repo`), so that code tracking is scoped to that engagement.
4. As a Freelancer, I want to connect my Linear account via OAuth, so that project tickets are created directly in my own Linear workspace.
5. As a Freelancer, I want to paste a Google Meet URL and dispatch a Meeting Bot, so that our kickoff or status call is recorded without manual note-taking.
6. As a Meeting Bot, I want to join the Google Meet call via Recall.ai webhooks and capture speaker-diarized audio, so that discussion transcripts are attributed to participants.
7. As a Freelancer, I want an AI agent to parse the transcript and extract milestones, task titles, descriptions, and estimates, so that I don't have to write tickets from scratch.
8. As a Freelancer, I want a Scope Review staging screen to edit, reorder, or delete AI-suggested tasks before they reach Linear, so that misheard or uncommitted items are not created.
9. As a Freelancer, I want to click "Publish Project", so that the approved tasks are batched into a new Linear project under my connected workspace.
10. As a Client and Freelancer, I want to receive an email via Resend containing the Linear project link and an executive milestone summary, so that both parties have written record of agreed scope.
11. As a Client, I want to access my CommitCheck project dashboard, so that I can view project health and audit code delivery.
12. As a Client, I want to click a "Verify Progress" button, so that an AI audit is triggered against the Freelancer's GitHub commits and PRs.
13. As an Audit Engine, I want to syntactically match Linear issue identifiers (e.g. `VAR-101`) in commit messages and branch names, so that directly linked work is immediately verified.
14. As an Audit Engine, I want to semantically evaluate git diffs using Gemini 1.5 Pro against task requirements, so that code changes without explicit ticket prefixes can still be verified.
15. As a Client, I want the Audit Report to alert me to "Ghost Completions" (tasks marked Done in Linear with no matching commits in GitHub), so that I don't pay for unbuilt features.
16. As a Client, I want the Audit Report to flag "Untracked Commits" (code added to GitHub that was not in the approved scope), so that scope creep is identified early.
17. As a Client, I want an inline "Request Clarification" action on any flagged task, so that I can ping the Freelancer directly about a discrepancy.
18. As a Freelancer, I want to trigger a "Self-Audit" from my dashboard, so that I can verify my commit references and repo hygiene before the Client checks.
19. As a Freelancer, I want to dispatch the Meeting Bot to follow-up meetings and generate Scope Addendums, so that subsequent revisions append to the existing Linear project rather than creating a fragmented new board.
20. As a Client, I want to view a historical timeline of past Audit Reports, so that I can track progress velocity over time.

## Implementation Decisions

1. **Authentication & Identity**:
   * Strictly provider-enforced roles (`FREELANCER` via GitHub OAuth, `CLIENT` via Google OAuth).
   * Stored in PostgreSQL with session handling in Next.js Auth.
2. **Database Schema (Prisma ORM)**:
   * `User`: Identity, role enum, OAuth access tokens (GitHub, Linear, Google).
   * `Project`: Title, client email, linked GitHub repo full name, Linear project ID & URL.
   * `Meeting`: Google Meet URL, Recall.ai bot ID, status (`PENDING`, `RECORDING`, `TRANSCRIBING`, `COMPLETED`), raw and diarized transcript JSON.
   * `LinearTaskDraft`: Staged tasks for Scope Review with title, description, priority, and estimate.
   * `AuditReport`: Immutable audit snapshots with progress score, auditor role (`CLIENT` vs `FREELANCER_SELF_CHECK`), task verification status mappings, and discrepancy breakdown JSON.
3. **External Integrations**:
   * **Recall.ai**: API call to spawn meeting bot; webhook endpoint `/api/webhooks/recall` to receive audio transcripts.
   * **Google Gemini 1.5 Pro**: Used via `@google/genai` with JSON schema enforcement for both transcript decomposition and code diff auditing.
   * **Linear SDK / REST API**: Creates project and issues in the Freelancer's workspace using their OAuth token.
   * **Octokit / GitHub REST API**: Queries commits, pull requests, and commit diffs on the bound repository.
   * **Resend**: Transactional email dispatch on project publication with custom HTML templates.
4. **Audit Engine Architecture**:
   * Two-pass algorithm: (1) Syntactic regex scan for issue keys (`[A-Z]+-\d+`) on commit messages and branches; (2) Semantic Gemini 1.5 Pro prompt comparing diff chunks to Linear acceptance criteria.
   * 10-minute cache/cooldown if GitHub shows no new commit SHAs since the last audit run.
5. **UI & Design System (Airbnb Standard)**:
   * Standardized on the Airbnb design system specification in `DESIGN.md`.
   * Primary accent: Airbnb Rausch (`#ff385c`) on pure white canvas (`#ffffff`) with near-black ink typography (`#222222`) and hairline dividers (`#dddddd`).
   * Geometry: Soft rounded corners—8px (`rounded-sm`) for buttons and text inputs, 14px (`rounded-md`) for project/audit cards, and full pill (`rounded-full`) for search bars and status badges.
   * Elevation: Single unified shadow tier (`rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px`).

## Testing Decisions

* Tests will strictly verify external behavior through the **Application Core Seam** without inspecting internal database implementation or intermediate states.
* External APIs (Recall.ai, Gemini, Linear, GitHub, Resend) are accessed through typed adapters that have deterministic in-memory fakes for unit and integration suites.
* Integration tests will simulate:
  1. Complete onboarding and project creation with repository linking.
  2. Recall.ai webhook ingestion -> Gemini extraction -> staged task generation.
  3. Freelancer approval -> Linear publishing and Resend dispatch.
  4. Audit execution -> simulated git commits with and without matching Linear tasks -> verified discrepancy and progress calculation.

## Out of Scope

* Automatic code merging or PR approval by the AI agent.
* Invoicing, escrow, and financial payment handling (CommitCheck focuses strictly on scope, tracking, and verification).
* Support for video platforms other than Google Meet (Zoom and Teams can be added in future iterations).

## Further Notes

* All design decisions are anchored in ADRs `0001` through `0014` in `docs/adr/`.
* Canonical terminology is defined in `GLOSSARY.md`.
