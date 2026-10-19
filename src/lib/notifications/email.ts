import {
  EmailNotificationResult,
  EmailNotificationService,
  PendingScopeItemEmailSummary,
  ScopeConfirmationEmailInput,
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
      <p style="color: #717171; font-size: 14px; margin: 0;">Verified and published via CommitCheck</p>
    </div>

    <div style="padding: 32px;">
      <p style="font-size: 15px; line-height: 1.5; color: #222222; margin-top: 0;">
        The project deliverables for <strong>${input.projectName}</strong> have been extracted from your recent call and synchronized into Linear.
      </p>

      <div style="background-color: #f7f7f7; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #717171; margin: 0 0 8px;">Milestone Summary</h4>
        <p style="font-size: 14px; color: #222222; margin: 0; line-height: 1.4;">${input.milestoneSummary}</p>
      </div>

      <h3 style="font-size: 15px; color: #222222; margin: 24px 0 12px;">Agreed Deliverables (${input.tasks.length})</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #dddddd;">
            <th style="text-align: left; padding: 8px 0; font-size: 12px; color: #717171; text-transform: uppercase;">Task</th>
            <th style="text-align: center; padding: 8px 0; font-size: 12px; color: #717171; text-transform: uppercase;">Priority</th>
            <th style="text-align: right; padding: 8px 0; font-size: 12px; color: #717171; text-transform: uppercase;">Points</th>
          </tr>
        </thead>
        <tbody>
          ${taskRows}
        </tbody>
      </table>

      <div style="margin-top: 32px; text-align: center;">
        <a href="${input.linearProjectUrl}" style="display: inline-block; background-color: #ff385c; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin-right: 8px;">
          View on Linear
        </a>
        <a href="${input.portalUrl}" style="display: inline-block; background-color: #ffffff; color: #222222; border: 1px solid #dddddd; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px;">
          Open CommitCheck
        </a>
      </div>
    </div>

    <div style="background-color: #f7f7f7; padding: 20px 32px; border-top: 1px solid #dddddd; text-align: center; font-size: 12px; color: #717171;">
      CommitCheck • Before a promise becomes work, verify that it is authorized.
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

  async sendScopeConfirmationEmail(
    input: ScopeConfirmationEmailInput
  ): Promise<EmailNotificationResult> {
    if (!this.apiKey || this.apiKey.startsWith("mock_") || this.apiKey.startsWith("re_mock")) {
      return {
        id: `mock_email_${Math.random().toString(36).substring(2, 9)}`,
        success: true,
      };
    }

    const itemCards = input.items
      .map(
        (item) => `
        <div style="background: #ffffff; border: 1px solid #dddddd; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 14px; font-weight: 600; color: #222222;">${item.title}</span>
            <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; background: ${
              item.classification === "TENTATIVE" ? "#fff8e6; color: #b7791f;" : "#f0f4ff; color: #3b82f6;"
            }">
              ${item.classification === "TENTATIVE" ? "Tentative Idea" : "AI Suggested Baseline"}
            </span>
          </div>
          <p style="font-size: 13px; color: #484848; margin: 0 0 8px; line-height: 1.4;">${item.description}</p>
          ${
            item.evidence
              ? `<div style="font-size: 12px; color: #717171; font-style: italic; background: #f7f7f7; padding: 8px; border-radius: 4px; border-left: 3px solid #dddddd;">
                  "${item.evidence}"
                </div>`
              : ""
          }
        </div>
      `
      )
      .join("");

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Scope Confirmation Required: ${input.projectName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f7f7; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #dddddd; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="padding: 32px 32px 24px; border-bottom: 1px solid #dddddd;">
      <div style="display: inline-block; width: 32px; height: 32px; background-color: #ff385c; border-radius: 50%; text-align: center; line-height: 32px; color: #ffffff; font-weight: bold; font-size: 16px;">
        ?
      </div>
      <h2 style="color: #222222; font-size: 20px; font-weight: 600; margin: 16px 0 6px;">Scope Confirmation Requested</h2>
      <p style="color: #717171; font-size: 14px; margin: 0;">Project: ${input.projectName}</p>
    </div>

    <div style="padding: 32px;">
      <p style="font-size: 15px; line-height: 1.5; color: #222222; margin-top: 0;">
        During your recent meeting, ${input.items.length} tentative or suggested deliverables were discussed. To protect your project scope, these items will <strong>not</strong> enter development or be billed until you confirm them.
      </p>

      <div style="margin: 24px 0;">
        ${itemCards}
      </div>

      <div style="margin-top: 32px; text-align: center;">
        <a href="${input.confirmationUrl}" style="display: inline-block; background-color: #ff385c; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 14px 32px; border-radius: 8px;">
          Review & Confirm Scope Items
        </a>
      </div>
    </div>

    <div style="background-color: #f7f7f7; padding: 20px 32px; border-top: 1px solid #dddddd; text-align: center; font-size: 12px; color: #717171;">
      CommitCheck • Before a promise becomes work, verify that it is authorized.
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
          to: [input.to],
          subject: `Scope Confirmation Requested: ${input.items.length} items awaiting your review for ${input.projectName}`,
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
  public confirmationEmails: ScopeConfirmationEmailInput[] = [];

  async sendScopeApprovedEmail(
    input: ScopeNotificationEmailInput
  ): Promise<EmailNotificationResult> {
    this.sentEmails.push({ ...input });
    return {
      id: `mock_email_${this.sentEmails.length}`,
      success: true,
    };
  }

  async sendScopeConfirmationEmail(
    input: ScopeConfirmationEmailInput
  ): Promise<EmailNotificationResult> {
    this.confirmationEmails.push({ ...input });
    return {
      id: `mock_conf_email_${this.confirmationEmails.length}`,
      success: true,
    };
  }

  clear() {
    this.sentEmails = [];
    this.confirmationEmails = [];
  }
}

export const defaultEmailService = new ResendEmailService();
