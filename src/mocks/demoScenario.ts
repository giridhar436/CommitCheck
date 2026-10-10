import { commitmentService } from '@/services/commitments'
import { changeRequestService } from '@/services/changeRequests'
import { scopeService } from '@/services/scope'

export interface DemoStep {
  step: number
  title: string
  subtitle: string
  path: string
  actionHint: string
  prdReference: string
}

export const HACKATHON_DEMO_STEPS: DemoStep[] = [
  {
    step: 1,
    title: 'Project Overview',
    subtitle: 'ABC E-Commerce Website (Budget: ₹4,50,000 / $55,000)',
    path: '/projects/proj-abc-ecommerce',
    actionHint: 'View the active client engagement baseline, budget, and risk profile.',
    prdReference: 'Step 1 — Create / Inspect Project',
  },
  {
    step: 2,
    title: 'Approved Scope & Exclusions',
    subtitle: 'Approved: 5 core modules • Excluded: Google Login',
    path: '/projects/proj-abc-ecommerce/scope',
    actionHint: 'Inspect the SOW boundary: Email Login is approved, Google Login is explicitly excluded.',
    prdReference: 'Step 2 — Upload Scope (Approved vs Not Included)',
  },
  {
    step: 3,
    title: 'Client Meeting Summary',
    subtitle: 'Sprint 3 Check-in • Client asks: "Can we also add Google Login?"',
    path: '/projects/proj-abc-ecommerce/meetings',
    actionHint: 'Click "Fill Demo Meeting" to load the verbatim dialogue and promises.',
    prdReference: 'Step 3 — Add Meeting Summary',
  },
  {
    step: 4,
    title: 'AI Commitment Verification',
    subtitle: 'Processing pipeline: Extraction → Scope Check → Authorization Check',
    path: '/projects/proj-abc-ecommerce/meetings',
    actionHint: 'Click "Analyze Meeting" to watch CommitCheck verify statements in real time.',
    prdReference: 'Step 4 — Analyze Meeting',
  },
  {
    step: 5,
    title: 'High-Risk Commitment Flagged',
    subtitle: 'High-Risk: Google Login promised by Developer for Friday',
    path: '/projects/proj-abc-ecommerce/commitments',
    actionHint: 'Notice the unauthorized alert badge and flagged scope creep item.',
    prdReference: 'Step 5 — AI Result (High-Risk Commitment)',
  },
  {
    step: 6,
    title: 'Inspect Verbatim Evidence',
    subtitle: 'Verbatim dialogue cross-referenced against SOW Clause 3.1 & 8.2',
    path: '/commitments/comm-google-login',
    actionHint: 'Review exact transcript quote, scope mismatch reason, and unbilled risk.',
    prdReference: 'Step 6 — Show Evidence & Scope Mismatch',
  },
  {
    step: 7,
    title: 'Generate Structured Change Order',
    subtitle: 'Convert verbal promise into priced CR (18h / 2.5 Days)',
    path: '/commitments/comm-google-login',
    actionHint: 'Click "Create Change Request" to formalize the commitment into a change order.',
    prdReference: 'Step 7 — Generate Change Request',
  },
  {
    step: 8,
    title: 'Client Approval & Baseline Sync',
    subtitle: 'Approved by Client VP • Commitment authorized & added to Scope',
    path: '/change-requests/cr-google-login',
    actionHint: 'Click "Approve Change Request" to authorize work and update the contract baseline.',
    prdReference: 'Step 8 — Approve & Authorize',
  },
]

export function resetHackathonDemoScenario(): void {
  commitmentService.reset()
  changeRequestService.reset()
  scopeService.reset()
}
