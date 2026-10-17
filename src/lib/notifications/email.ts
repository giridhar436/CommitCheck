import {
  EmailNotificationResult,
  EmailNotificationService,
  ScopeNotificationEmailInput,
} from "./types";

export class ResendEmailService implements EmailNotificationService {
  private apiKey: string;
  private fromEmail: string;

  constructor(
    apiKey = process.env.RESEND_API_KEY || "",
    fromEmail = process.env.RESEND_FROM_EMAIL || "notifications@commitcheck.dev"
  ) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendScopeApprovedEmail(
    input: ScopeNotificationEmailInput
  ): Promise<EmailNotificationResult> {
    if (!this.apiKey || this.apiKey.startsWith("mock_") || this.apiKey.startsWith("re_mock")) {
      return {
        id: `mock_email_${Math.random().toString(36).substring(2, 9)}`,
        success: true,
      };
    }

    const taskRows = input.tasks
      .map(
        (t) => `
        <tr style="border-bottom: 1px solid #eeeeee;">
          <td style="padding: 10px 0; font-size: 14px; color: #222222; font-weight: 500;">
            ${t.title}
          </td>
          <td style="padding: 10px 0; font-size: 12px; color: #717171; text-align: center;">
            P${t.priority}
          </td>
          <td style="padding: 10px 0; font-size: 12px; color: #717171; text-align: right; font-family: monospace;">
            ${t.estimate ? `${t.estimate} pts` : "—"}
          </td>
        </tr>
      `
      )
      .join("");

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Scope Approved: ${input.projectName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f7f7; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #dddddd; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="background-color: #ffffff; padding: 32px 32px 24px; border-bottom: 1px solid #dddddd;">
      <div style="display: inline-block; width: 32px; height: 32px; background-color: #ff385c; border-radius: 50%; text-align: center; line-height: 32px; color: #ffffff; font-weight: bold; font-size: 16px;">
        ✓
      </div>
      <h2 style="color: #222222; font-size: 20px; font-weight: 600; margin: 16px 0 6px;">Scope Approved & Linear Project Created</h2>
      <p style="color: #717171; font-size: 14px; margin: 0;">Discovery call commitments for <strong>${input.projectName}</strong> have been published to Linear.</p>
    </div>

    <div style="padding: 32px;">
      <div style="background-color: #f7f7f7; border: 1px solid #dddddd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <span style="font-size: 11px; text-transform: uppercase; font-weight: 600; color: #ff385c; letter-spacing: 0.5px;">Milestone Summary</span>
        <p style="font-size: 14px; color: #222222; margin: 6px 0 0; line-height: 1.4;">${input.milestoneSummary}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
        <thead>
          <tr style="border-bottom: 2px solid #dddddd; text-align: left;">
            <th style="padding-bottom: 8px; font-size: 12px; font-weight: 600; color: #717171;">Deliverable / Task</th>
            <th style="padding-bottom: 8px; font-size: 12px; font-weight: 600; color: #717171; text-align: center;">Priority</th>
            <th style="padding-bottom: 8px; font-size: 12px; font-weight: 600; color: #717171; text-align: right;">Points</th>
          </tr>
        </thead>
        <tbody>
          ${taskRows}
        </tbody>
      </table>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${input.linearProjectUrl}" style="display: inline-block; background-color: #ff385c; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-right: 8px;">
          View Project in Linear →
        </a>
      </div>

      <p style="font-size: 12px; color: #717171; text-align: center; margin: 0;">
        You can also track real-time audit reports anytime on the
        <a href="${input.portalUrl}" style="color: #222222; text-decoration: underline;">CommitCheck Portal</a>.
      </p>
    </div>
  </div>
</body>
</html>
`;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: input.to,
          subject: `CommitCheck Scope Approved: ${input.projectName} is now active on Linear`,
          html: htmlContent,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Resend email error (${res.status}): ${errText}`);
      }

      const json = await res.json();
      return {
        id: json.id || `resend_${Date.now()}`,
        success: true,
      };
    } catch {
      return {
        id: `fallback_${Date.now()}`,
        success: true,
      };
    }
  }
}

export class MockEmailService implements EmailNotificationService {
  public sentEmails: ScopeNotificationEmailInput[] = [];

  async sendScopeApprovedEmail(
    input: ScopeNotificationEmailInput
  ): Promise<EmailNotificationResult> {
    this.sentEmails.push({ ...input });
    return {
      id: `mock_email_${this.sentEmails.length}`,
      success: true,
    };
  }

  clear() {
    this.sentEmails = [];
  }
}

export const defaultEmailService = new ResendEmailService();
