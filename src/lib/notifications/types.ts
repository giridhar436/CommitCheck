export interface TaskEmailSummary {
  title: string;
  priority: number;
  estimate?: number | null;
  identifier?: string;
  url?: string;
}

export interface ScopeNotificationEmailInput {
  to: string[];
  projectName: string;
  linearProjectUrl: string;
  milestoneSummary: string;
  portalUrl: string;
  tasks: TaskEmailSummary[];
}

export interface PendingScopeItemEmailSummary {
  title: string;
  description: string;
  classification: "AI_INFERRED" | "TENTATIVE" | string;
  evidence?: string;
  estimate?: number | null;
}

export interface ScopeConfirmationEmailInput {
  to: string;
  clientName?: string;
  freelancerName?: string;
  projectName: string;
  confirmationUrl: string;
  items: PendingScopeItemEmailSummary[];
}

export interface EmailNotificationResult {
  id: string;
  success: boolean;
}

export interface EmailNotificationService {
  sendScopeApprovedEmail(input: ScopeNotificationEmailInput): Promise<EmailNotificationResult>;
  sendScopeConfirmationEmail(input: ScopeConfirmationEmailInput): Promise<EmailNotificationResult>;
}
