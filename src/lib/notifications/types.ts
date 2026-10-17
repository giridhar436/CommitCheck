export interface TaskEmailSummary {
  title: string;
  priority: number;
  estimate?: number | null;
}

export interface ScopeNotificationEmailInput {
  to: string[];
  projectName: string;
  linearProjectUrl: string;
  milestoneSummary: string;
  portalUrl: string;
  tasks: TaskEmailSummary[];
}

export interface EmailNotificationResult {
  id: string;
  success: boolean;
}

export interface EmailNotificationService {
  sendScopeApprovedEmail(input: ScopeNotificationEmailInput): Promise<EmailNotificationResult>;
}
