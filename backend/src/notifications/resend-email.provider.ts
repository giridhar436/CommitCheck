import { Injectable, Logger } from '@nestjs/common';
import type { NotificationDelivery, NotificationProvider } from './notification-provider.interface';

/**
 * Production email provider (Phase 15) via Resend.
 *
 * Active only when BOTH are configured (otherwise the dev log provider is
 * used — graceful degradation, no fake emails):
 *   RESEND_API_KEY  API key — SECRET, server-side only
 *   RESEND_FROM     verified sender, e.g. "CommitCheck <noreply@example.com>"
 *
 * SECURITY invariants: the API key is never logged, never returned, and
 * never appears in error messages (status codes only). Deliveries are
 * transactional only — no marketing/bulk surface exists.
 */
@Injectable()
export class ResendEmailProvider implements NotificationProvider {
  readonly name = 'resend-email';
  private readonly logger = new Logger('Notifications');

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  static fromEnv(): ResendEmailProvider | null {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM?.trim();
    return apiKey && from ? new ResendEmailProvider(apiKey, from) : null;
  }

  async send(delivery: NotificationDelivery): Promise<void> {
    if (!delivery.to) {
      // Callers without an address on file cannot receive email; surface as
      // a normal failure so the notification_log row records the reason.
      throw new Error('recipient has no email address on file');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [delivery.to],
        subject: delivery.subject,
        text: delivery.body,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // Status only — never echo request/response bodies (they could carry the key).
      this.logger.warn(`Resend delivery failed with status ${response.status}`);
      throw new Error(`email delivery failed (status ${response.status})`);
    }
  }
}
