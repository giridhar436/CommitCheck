/* ——————————————————————————————————————————————————————————————————————————
 * CommitCheck — Seed Data (Phase 1)
 * ——————————————————————————————————————————————————————————————————————————
 * Two interconnected demo projects covering the full business flow:
 *
 *   Project → Scope → Meeting (with attachments) → Commitment Detection
 *   → Scope Verification → Authorized / Unauthorized / Pending commitments
 *   → Change Requests (approved / rejected / pending) → Activity audit trail
 *
 * All rows reference each other by real FK values — no orphaned records.
 * Deterministic UUIDs are used so re-seeding is idempotent-friendly.
 * ————————————————————————————————————————————————————————————————————————— */

import { PrismaClient, Priority, RiskLevel, ApprovalStatus, MeetingAnalysisStatus, ChangeRequestStatus, DocumentType, EvidenceSource, ActivityAction, ActivityEntityType, ProjectRole } from '@prisma/client';

const prisma = new PrismaClient();

// Deterministic UUIDs (UUIDv5-shaped literals) — keep the demo graph stable
// across reseeds and easy to reference in docs/screenshots.
const IDS = {
  // Project 1 — NovaBank
  novaProject: 'a1111111-1111-4111-8111-111111111111',
  // Project 2 — FreshCART
  cartProject: 'a2222222-2222-4222-8222-222222222222',
  // Demo owner (Supabase Auth user id — matches a user in the configured
  // Supabase Auth instance; in tests it matches the token minted by the
  // verification suites).
  demoUser: 'b1111111-1111-4111-8111-111111111111',
};

async function main() {
  console.log('🌱 Seeding CommitCheck demo data…');

  // Clear in FK-safe order (children first).
  await prisma.notificationLog.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.commitmentEvidence.deleteMany();
  await prisma.commitment.deleteMany();
  await prisma.meetingAttachment.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.document.deleteMany();
  await prisma.scopeRequirement.deleteMany();
  await prisma.project.deleteMany();

  // ————————————————————————————————————————————————————
  // Project 1 — NovaBank (agency client, active, has unauthorized work)
  // ————————————————————————————————————————————————————
  const novaBank = await prisma.project.create({
    data: {
      id: IDS.novaProject,
      name: 'NovaBank Mobile App',
      clientName: 'NovaBank Ltd.',
      description:
        'Cross-platform mobile banking app with onboarding, KYC, transfers and spending analytics. Fixed-scope engagement delivered in three phases.',
      status: 'ACTIVE',
      startDate: new Date('2026-08-03'),
      endDate: new Date('2026-12-18'),
      budget: 86000,
      ownerUserId: IDS.demoUser,
      members: {
        create: { userId: IDS.demoUser, role: ProjectRole.OWNER, email: 'rahul@pixelforge.io' },
      },
    },
  });

  // ——— Approved scope ———
  const novaScope = await Promise.all(
    (
      [
        {
          title: 'User onboarding & KYC flow',
          description: 'Phone verification, document upload and automated identity checks for new customers.',
          category: 'Authentication',
          priority: Priority.CRITICAL,
          approvalStatus: ApprovalStatus.AUTHORIZED,
          sourceClause: 'SOW §3.1 — Onboarding',
          acceptanceCriteria: 'A new user can complete registration and KYC in under 4 minutes; failure states retry gracefully.',
        },
        {
          title: 'P2P transfers',
          description: 'Instant peer-to-peer transfers between NovaBank accounts with confirmation and receipt.',
          category: 'Payments',
          priority: Priority.CRITICAL,
          approvalStatus: ApprovalStatus.AUTHORIZED,
          sourceClause: 'SOW §3.2 — Transfers',
          acceptanceCriteria: 'Transfers settle in < 5s; receipt is emailed and stored in-app.',
        },
        {
          title: 'Spending analytics dashboard',
          description: 'Categorized spending overview with monthly trends and top-merchants breakdown.',
          category: 'Analytics',
          priority: Priority.HIGH,
          approvalStatus: ApprovalStatus.AUTHORIZED,
          sourceClause: 'SOW §3.3 — Analytics',
          acceptanceCriteria: 'Dashboard renders 90 days of categorized transactions with monthly and weekly filters.',
        },
        {
          title: 'Push notifications for transactions',
          description: 'Real-time push alerts for card transactions and completed transfers.',
          category: 'Notifications',
          priority: Priority.MEDIUM,
          approvalStatus: ApprovalStatus.PENDING,
          sourceClause: 'Proposal v2 §5 — Notifications (deferred to phase 3)',
          acceptanceCriteria: 'Users receive a push within 2s of a transaction posting; opt-out available per category.',
        },
      ] as const
    ).map((r) =>
      prisma.scopeRequirement.create({
        data: { ...r, projectId: novaBank.id },
      }),
    ),
  );

  // ——— Documents ———
  await Promise.all(
    (
      [
        { title: 'NovaBank SOW v3 (signed)', type: DocumentType.SOW, storagePath: 'projects/novabank/docs/novabank-sow-v3.pdf', size: 482_133 },
        { title: 'Technical Requirements Spec', type: DocumentType.REQUIREMENTS, storagePath: 'projects/novabank/docs/tech-requirements.pdf', size: 267_912 },
        { title: 'Master Services Agreement', type: DocumentType.CONTRACT, storagePath: 'projects/novabank/docs/msa-2026.pdf', size: 191_004 },
      ] as const
    ).map((d) =>
      prisma.document.create({
        data: {
          projectId: novaBank.id,
          title: d.title,
          type: d.type,
          storagePath: d.storagePath,
          fileSize: d.size,
        },
      }),
    ),
  );

  // ——— Meeting 1: sprint review where scope creep happened ———
  const novaMeeting1 = await prisma.meeting.create({
    data: {
      projectId: novaBank.id,
      title: 'Sprint 4 Review — Client Sync',
      summary:
        'Demoed onboarding and P2P transfer flows. Client asked for Google Login "while we are at it" and a CSV export of analytics. Team verbally agreed to both. Neither item exists in the signed SOW.',
      meetingDate: new Date('2026-09-29T14:00:00Z'),
      analysisStatus: MeetingAnalysisStatus.COMPLETED,
      attachments: {
        create: [
          { fileName: 'sprint4-review-transcript.txt', fileType: 'text/plain', storagePath: 'meetings/novabank/sprint4-review-transcript.txt', fileSize: 24_118 },
          { fileName: 'sprint4-notes.md', fileType: 'text/markdown', storagePath: 'meetings/novabank/sprint4-notes.md', fileSize: 4_412 },
        ],
      },
    },
  });

  // ——— Commitments detected in meeting 1 ———
  const cGoogleLogin = await prisma.commitment.create({
    data: {
      projectId: novaBank.id,
      meetingId: novaMeeting1.id,
      title: 'Add Google Login to onboarding',
      description: 'Team promised to integrate "Sign in with Google" as an alternative to phone verification in the onboarding flow.',
      speaker: 'Dana (Team Lead)',
      riskLevel: RiskLevel.HIGH,
      authorizationStatus: ApprovalStatus.UNAUTHORIZED,
      confidenceScore: 0.94,
      evidenceReference: 'sprint4-review-transcript.txt',
      evidence: {
        create: [
          {
            quote: 'Client: "Can we also add Google Login? Our users hate typing phone numbers." — Dana: "Sure, I\'ll add it by Friday."',
            timestamp: new Date('2026-09-29T14:12:00Z'),
            source: EvidenceSource.TRANSCRIPT,
          },
          {
            quote: 'Dana confirmed on the recap email: "Google sign-in will ship with the onboarding update."',
            source: EvidenceSource.NOTES,
          },
        ],
      },
    },
  });

  const cCsvExport = await prisma.commitment.create({
    data: {
      projectId: novaBank.id,
      meetingId: novaMeeting1.id,
      title: 'CSV export for analytics dashboard',
      description: 'Promised a one-click CSV export of the spending dashboard, including custom date ranges.',
      speaker: 'Miguel (Developer)',
      riskLevel: RiskLevel.MEDIUM,
      authorizationStatus: ApprovalStatus.UNAUTHORIZED,
      confidenceScore: 0.88,
      evidenceReference: 'sprint4-review-transcript.txt',
      evidence: {
        create: [
          {
            quote: 'Client: "Can finance download this as a spreadsheet?" — Miguel: "Yes, we can add a CSV export button."',
            timestamp: new Date('2026-09-29T14:26:00Z'),
            source: EvidenceSource.TRANSCRIPT,
          },
        ],
      },
    },
  });

  const cTransfersDemo = await prisma.commitment.create({
    data: {
      projectId: novaBank.id,
      meetingId: novaMeeting1.id,
      title: 'Polish P2P transfer confirmation screen',
      description: 'Client asked for clearer success feedback; team confirmed the existing SOW item covers this polish.',
      speaker: 'Dana (Team Lead)',
      riskLevel: RiskLevel.LOW,
      authorizationStatus: ApprovalStatus.AUTHORIZED,
      confidenceScore: 0.97,
      evidenceReference: 'sprint4-review-transcript.txt',
      evidence: {
        create: [
          {
            quote: 'Dana: "The confirmation screen polish is part of what we agreed in the SOW — it lands in Sprint 5."',
            timestamp: new Date('2026-09-29T14:41:00Z'),
            source: EvidenceSource.TRANSCRIPT,
          },
        ],
      },
    },
  });

  // ——— Change requests arising from unauthorized commitments ———
  const crGoogleLogin = await prisma.changeRequest.create({
    data: {
      projectId: novaBank.id,
      commitmentId: cGoogleLogin.id,
      title: 'CR-001: Google Login integration',
      description:
        'Formalize the Google Login commitment from the Sprint 4 review. Requires OAuth consent-screen setup, ~3 dev-days for integration plus tests. Not covered by SOW §3.1.',
      status: ChangeRequestStatus.PENDING,
    },
  });

  await prisma.changeRequest.create({
    data: {
      projectId: novaBank.id,
      commitmentId: cCsvExport.id,
      title: 'CR-002: Analytics CSV export',
      description:
        'Add CSV export with custom date ranges to the spending dashboard. Estimated 2 dev-days including e2e tests. Requires separate approval — outside SOW §3.3.',
      status: ChangeRequestStatus.APPROVED,
      approvalReason:
        'Approved by NovaBank product owner on 2026-10-02 — billed as change order CO-114 at the standard day rate; scheduled for Sprint 6.',
    },
  });

  // ——— Meeting 2: earlier kickoff, clean ———
  const novaMeeting2 = await prisma.meeting.create({
    data: {
      projectId: novaBank.id,
      title: 'Project Kickoff & Scope Walkthrough',
      summary: 'Walked through the signed SOW, agreed sprint cadence (2 weeks), demo schedule and communication channels. No scope discussion beyond the SOW.',
      meetingDate: new Date('2026-08-05T10:00:00Z'),
      analysisStatus: MeetingAnalysisStatus.COMPLETED,
      attachments: {
        create: [
          { fileName: 'kickoff-transcript.txt', fileType: 'text/plain', storagePath: 'meetings/novabank/kickoff-transcript.txt', fileSize: 18_940 },
        ],
      },
    },
  });

  await prisma.commitment.create({
    data: {
      projectId: novaBank.id,
      meetingId: novaMeeting2.id,
      title: 'Deliver onboarding flow demo by Sprint 2',
      description: 'Team committed to demoing the KYC onboarding flow at the end of Sprint 2, per the SOW timeline.',
      speaker: 'Dana (Team Lead)',
      riskLevel: RiskLevel.LOW,
      authorizationStatus: ApprovalStatus.AUTHORIZED,
      confidenceScore: 0.99,
      evidenceReference: 'kickoff-transcript.txt',
      evidence: {
        create: [
          {
            quote: 'Dana: "You will see the full onboarding flow — phone verification included — at the Sprint 2 demo."',
            timestamp: new Date('2026-08-05T10:22:00Z'),
            source: EvidenceSource.TRANSCRIPT,
          },
        ],
      },
    },
  });

  // ——— Meeting 3: pending AI analysis ———
  const novaMeeting3 = await prisma.meeting.create({
    data: {
      projectId: novaBank.id,
      title: 'Ad-hoc Client Call — Card Freezing Feature',
      summary: 'Client floated adding card freeze/unfreeze. No commitments made yet; transcript submitted for analysis.',
      meetingDate: new Date('2026-10-09T16:30:00Z'),
      analysisStatus: MeetingAnalysisStatus.PROCESSING,
      attachments: {
        create: [
          { fileName: 'adhoc-call-recording.m4a', fileType: 'audio/mp4', storagePath: 'meetings/novabank/adhoc-call-recording.m4a', fileSize: 8_912_336 },
        ],
      },
    },
  });

  // ——— Activity trail for NovaBank ———
  await prisma.activity.createMany({
    data: [
      { projectId: novaBank.id, action: ActivityAction.PROJECT_CREATED, entityType: ActivityEntityType.PROJECT, entityId: novaBank.id, description: 'Project "NovaBank Mobile App" created for NovaBank Ltd.', createdAt: new Date('2026-08-03T09:00:00Z') },
      { projectId: novaBank.id, action: ActivityAction.DOCUMENT_UPLOADED, entityType: ActivityEntityType.DOCUMENT, entityId: null, description: 'Uploaded "NovaBank SOW v3 (signed)"', createdAt: new Date('2026-08-03T09:05:00Z') },
      { projectId: novaBank.id, action: ActivityAction.SCOPE_UPDATED, entityType: ActivityEntityType.SCOPE_REQUIREMENT, entityId: novaScope[0].id, description: 'Approved scope requirement "User onboarding & KYC flow"', createdAt: new Date('2026-08-03T09:20:00Z') },
      { projectId: novaBank.id, action: ActivityAction.MEETING_ANALYZED, entityType: ActivityEntityType.MEETING, entityId: novaMeeting1.id, description: 'AI analysis completed for "Sprint 4 Review — Client Sync" — 3 commitments detected', createdAt: new Date('2026-09-29T15:02:00Z') },
      { projectId: novaBank.id, action: ActivityAction.COMMITMENT_FLAGGED, entityType: ActivityEntityType.COMMITMENT, entityId: cGoogleLogin.id, description: 'HIGH-RISK unauthorized commitment: "Add Google Login to onboarding"', createdAt: new Date('2026-09-29T15:02:01Z') },
      { projectId: novaBank.id, action: ActivityAction.CHANGE_REQUEST_CREATED, entityType: ActivityEntityType.CHANGE_REQUEST, entityId: crGoogleLogin.id, description: 'Change request "CR-001: Google Login integration" created', createdAt: new Date('2026-09-30T08:15:00Z') },
    ],
  });

  // ————————————————————————————————————————————————————
  // Project 2 — FreshCART (e-commerce client, on hold, mixed outcomes)
  // ————————————————————————————————————————————————————
  const freshCart = await prisma.project.create({
    data: {
      id: IDS.cartProject,
      name: 'FreshCART Storefront',
      clientName: 'FreshCART Grocery',
      description:
        'Online grocery storefront with catalog search, cart, checkout and delivery-slot scheduling. Retainer-based engagement, currently on hold pending client rebranding.',
      status: 'ON_HOLD',
      startDate: new Date('2026-05-11'),
      endDate: null,
      budget: 42000,
      ownerUserId: IDS.demoUser,
      members: {
        create: { userId: IDS.demoUser, role: ProjectRole.OWNER, email: 'rahul@pixelforge.io' },
      },
    },
  });

  const cartScope = await Promise.all(
    (
      [
        {
          title: 'Catalog & faceted search',
          description: 'Product catalog with category, price and dietary-filter facets, full-text search.',
          category: 'Catalog',
          priority: Priority.HIGH,
          approvalStatus: ApprovalStatus.AUTHORIZED,
          sourceClause: 'SOW §2.1 — Catalog',
          acceptanceCriteria: 'Search results render under 300ms p95 with filters applied server-side.',
        },
        {
          title: 'Cart & checkout',
          description: 'Persistent cart, discount codes, payment via Stripe, order confirmation emails.',
          category: 'Commerce',
          priority: Priority.CRITICAL,
          approvalStatus: ApprovalStatus.AUTHORIZED,
          sourceClause: 'SOW §2.2 — Checkout',
          acceptanceCriteria: 'Checkout completes end-to-end with Stripe test cards; order emails fire within 1 minute.',
        },
        {
          title: 'Delivery slot scheduling',
          description: 'Customers pick a delivery window at checkout; capacity capped per slot.',
          category: 'Logistics',
          priority: Priority.MEDIUM,
          approvalStatus: ApprovalStatus.AUTHORIZED,
          sourceClause: 'SOW §2.3 — Delivery',
          acceptanceCriteria: 'Slot capacity is enforced; overflowing orders are offered the next available window.',
        },
        {
          title: 'Loyalty points pilot',
          description: 'Earn-and-burn loyalty points pilot for two flagship stores.',
          category: 'Commerce',
          priority: Priority.LOW,
          approvalStatus: ApprovalStatus.PENDING,
          sourceClause: 'Client email 2026-06-20 — pilot proposal (not yet contracted)',
          acceptanceCriteria: 'Points accrue at 1% of order value and redeem at checkout for pilot stores only.',
        },
      ] as const
    ).map((r) =>
      prisma.scopeRequirement.create({
        data: { ...r, projectId: freshCart.id },
      }),
    ),
  );

  await prisma.document.create({
    data: {
      projectId: freshCart.id,
      title: 'FreshCART SOW (retainer annex)',
      type: DocumentType.SOW,
      storagePath: 'projects/freshcart/docs/freshcart-sow-annex.pdf',
      fileSize: 311_245,
    },
  });

  const cartMeeting = await prisma.meeting.create({
    data: {
      projectId: freshCart.id,
      title: 'Monthly Retainer Review',
      summary: 'Reviewed checkout conversion metrics. Client requested WhatsApp order updates and a mobile wallet pass; team pushed back on the wallet pass, agreed to look into WhatsApp BSP pricing.',
      meetingDate: new Date('2026-07-22T11:00:00Z'),
      analysisStatus: MeetingAnalysisStatus.COMPLETED,
      attachments: {
        create: [
          { fileName: 'retainer-review-july.pdf', fileType: 'application/pdf', storagePath: 'meetings/freshcart/retainer-review-july.pdf', fileSize: 402_887 },
        ],
      },
    },
  });

  const cWhatsapp = await prisma.commitment.create({
    data: {
      projectId: freshCart.id,
      meetingId: cartMeeting.id,
      title: 'WhatsApp order status updates',
      description: 'Team agreed to investigate WhatsApp Business API pricing and report back; no build commitment was made, pending the loyalty-pilot decision.',
      speaker: 'Priya (Project Manager)',
      riskLevel: RiskLevel.MEDIUM,
      authorizationStatus: ApprovalStatus.PENDING,
      confidenceScore: 0.72,
      evidenceReference: 'retainer-review-july.pdf',
      evidence: {
        create: [
          {
            quote: 'Priya: "I\'ll get WhatsApp BSP pricing by next week and we can decide whether it goes through a change request."',
            timestamp: new Date('2026-07-22T11:34:00Z'),
            source: EvidenceSource.DOCUMENT,
          },
        ],
      },
    },
  });

  const cWalletPass = await prisma.commitment.create({
    data: {
      projectId: freshCart.id,
      meetingId: cartMeeting.id,
      title: 'Apple/Google wallet pass for order tracking',
      description: 'Client asked for a wallet pass; team declined in-meeting — out of retainer scope. Recorded for the audit trail.',
      speaker: 'Priya (Project Manager)',
      riskLevel: RiskLevel.LOW,
      authorizationStatus: ApprovalStatus.AUTHORIZED,
      confidenceScore: 0.81,
      evidenceReference: 'retainer-review-july.pdf',
      evidence: {
        create: [
          {
            quote: 'Priya: "A wallet pass would be new scope — happy to scope it as a change request, but it is not part of the retainer."',
            timestamp: new Date('2026-07-22T11:52:00Z'),
            source: EvidenceSource.DOCUMENT,
          },
        ],
      },
    },
  });

  await prisma.changeRequest.create({
    data: {
      projectId: freshCart.id,
      commitmentId: cWhatsapp.id,
      title: 'CR-101: WhatsApp order notifications',
      description:
        'WhatsApp Business API integration for order status updates. Pricing investigation pending; blocked until the loyalty-pilot contract decision.',
      status: ChangeRequestStatus.PENDING,
    },
  });

  await prisma.changeRequest.create({
    data: {
      projectId: freshCart.id,
      commitmentId: cWalletPass.id,
      title: 'CR-102: Wallet pass for order tracking',
      description: 'Scope the Apple/Google wallet pass as billable work outside the retainer.',
      status: ChangeRequestStatus.REJECTED,
      approvalReason: 'Rejected by FreshCART ops lead — deferred until after the rebrand; revisit in Q1 2027.',
    },
  });

  await prisma.activity.createMany({
    data: [
      { projectId: freshCart.id, action: ActivityAction.PROJECT_CREATED, entityType: ActivityEntityType.PROJECT, entityId: freshCart.id, description: 'Project "FreshCART Storefront" created for FreshCART Grocery', createdAt: new Date('2026-05-11T08:30:00Z') },
      { projectId: freshCart.id, action: ActivityAction.SCOPE_UPDATED, entityType: ActivityEntityType.SCOPE_REQUIREMENT, entityId: cartScope[1].id, description: 'Approved scope requirement "Cart & checkout"', createdAt: new Date('2026-05-11T08:45:00Z') },
      { projectId: freshCart.id, action: ActivityAction.MEETING_ANALYZED, entityType: ActivityEntityType.MEETING, entityId: cartMeeting.id, description: 'AI analysis completed for "Monthly Retainer Review" — 2 commitments detected', createdAt: new Date('2026-07-22T12:10:00Z') },
      { projectId: freshCart.id, action: ActivityAction.CHANGE_REQUEST_REJECTED, entityType: ActivityEntityType.CHANGE_REQUEST, entityId: null, description: 'Change request "CR-102: Wallet pass for order tracking" was rejected', createdAt: new Date('2026-07-25T10:00:00Z') },
    ],
  });

  // ——— Summary ———
  const counts = {
    projects: await prisma.project.count(),
    projectMembers: await prisma.projectMember.count(),
    scopeRequirements: await prisma.scopeRequirement.count(),
    meetings: await prisma.meeting.count(),
    meetingAttachments: await prisma.meetingAttachment.count(),
    commitments: await prisma.commitment.count(),
    commitmentEvidence: await prisma.commitmentEvidence.count(),
    changeRequests: await prisma.changeRequest.count(),
    documents: await prisma.document.count(),
    activities: await prisma.activity.count(),
  };
  console.log('✅ Seed complete:', counts);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
