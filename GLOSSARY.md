# CommitCheck

CommitCheck is an AI-powered verification platform for freelance software engagements, bridging client meetings, Linear task tracking, and GitHub codebase activity.

## Language

**Freelancer**:
The contractor or developer executing code, creating projects, and delivering software.
_Avoid_: Developer, Vendor, Worker, Contractor

**Client**:
The customer or product owner commissioning the project, receiving updates, and auditing deliverables.
_Avoid_: Customer, Buyer, Employer, Stakeholder

**Project**:
A shared engagement binding a Freelancer, a Client, a Linear Project, and a GitHub Repository.
_Avoid_: Contract, Workspace, Engagement

**Meeting Bot**:
The automated participant dispatched into Google Meet calls to capture audio and produce a timestamped transcript.
_Avoid_: Notetaker, Recorder, Listener

**Scope Transcript**:
The raw or diarized textual record of a project discovery/planning meeting between Freelancer and Client.
_Avoid_: Call log, Recording, Meeting notes

**Linear Project**:
The set of tangible issues and milestones generated from a Scope Transcript in Linear.
_Avoid_: Ticket board, Backlog, Task list

**Audit**:
An on-demand verification process triggered by a Client that inspects GitHub commits/PRs against Linear task completion status.
_Avoid_: Scan, Inspection, Health check, Sync

**Discrepancy**:
A verifiable divergence between task status in Linear and actual code changes in GitHub (e.g., marked Done without commits).
_Avoid_: Bug, Error, Warning, Issue

**Scope Review**:
The review stage where extracted tasks from a Scope Transcript are reviewed and approved before creating them in Linear.
_Avoid_: Task preview, Draft stage, Staging

**Audit Report**:
An immutable record produced during an Audit, summarizing verified completion percentage and itemized discrepancies.
_Avoid_: Scan result, Verification log, Diff report

**Ghost Completion**:
A severe discrepancy where a task is marked Done in Linear, but git inspection uncovers zero matching implementation code.
_Avoid_: Fake task, Phantom ticket, False positive

**Scope Addendum**:
An incremental batch of tasks derived from a subsequent meeting, appended to an existing Project's Linear board.
_Avoid_: Change order, Scope creep, Revision

**Explicit Requirement**:
A functional or technical deliverable directly agreed upon by both Client and Freelancer during a meeting.
_Avoid_: Hard requirement, Definite task

**AI-Inferred Requirement**:
A baseline functional or technical deliverable deduced by AI from overall product intent, requiring explicit Client authorization before entering approved scope.
_Avoid_: Implied task, AI hallucination, Suggested scope

**Tentative Requirement**:
An idea, proposal, or casual comment discussed during a meeting without definitive commitment, held outside approved scope until confirmed by the Client.
_Avoid_: Soft scope, Stretch goal, Nice-to-have

**Confirmed Commitment**:
A concrete deliverable or milestone promised by the Freelancer with an agreed delivery expectation or deadline.
_Avoid_: Promise, SLA, Handshake

**Scope Confirmation**:
A formal verification action by the Client converting tentative or AI-inferred requirements into approved scope.
_Avoid_: Sign-off, Client approval, Scope lock


