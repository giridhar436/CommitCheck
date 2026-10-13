import { Injectable, Logger } from '@nestjs/common';
import { NotificationStatus, Prisma, ProjectRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LogNotificationProvider } from './log-notification.provider';
import { ResendEmailProvider } from './resend-email.provider';
import type { NotificationProvider } from './notification-provider.interface';

export interface NotificationRequest {
  /**
   * Dedup key WITHOUT the recipient suffix — one logical event. Each
   * event+recipient row is `<eventKey>:<userId>`, so a repeated emit of the
   * same event is a no-op instead of a duplicate notification.
   */
  eventKey: string;
  /** Machine-readable event type, e.g. `verification.high_risk_unauthorized`. */
  type: string;
  projectId: string;
  entityType?: string;
  entityId?: string;
  recipients: Array<{ userId: string; email: string | null }>;
  subject: string;
  body: string;
}

export type NotificationOutcome = 'SENT' | 'FAILED' | 'SKIPPED';

export interface RecipientRef {
  userId: string;
  email: string | null;
}

/**
 * Phase 15 — notification orchestration.
 *
 * Guarantees (spec):
 *  - NEVER throws into the calling (authorization/change-request) flow —
 *    a provider outage cannot corrupt or roll back a business transaction.
 *  - No duplicate notifications for the same event: the per-recipient row's
 *    unique eventKey doubles as the dedup claim (P2002 → SKIPPED).
 *  - Failures are observable: status stays FAILED with a sanitized error,
 *    and a warning is logged.
 *  - Graceful degradation: without email config the dev log provider runs.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly provider: NotificationProvider;

  constructor(private readonly prisma: PrismaService) {
    this.provider = ResendEmailProvider.fromEnv() ?? new LogNotificationProvider();
  }

  get status(): { provider: string; emailConfigured: boolean; reason: string | null } {
    const emailConfigured = this.provider.name === 'resend-email';
    return {
      provider: this.provider.name,
      emailConfigured,
      reason: emailConfigured
        ? null
        : 'Email delivery not configured (RESEND_API_KEY / RESEND_FROM) — notifications are written to the application log.',
    };
  }

  /**
   * Attempt delivery of one event to each recipient. Resolves (never
   * rejects); callers may still `.catch(() => {})` for total safety.
   */
  async notify(request: NotificationRequest): Promise<NotificationOutcome[]> {
    const outcomes: NotificationOutcome[] = [];

    if (request.recipients.length === 0) {
      return ['SKIPPED'];
    }

    for (const recipient of request.recipients) {
      outcomes.push(await this.deliverTo(request, recipient));
    }
    return outcomes;
  }

  /**
   * Project OWNER + ADMINs — the approval-capable audience for alerts and
   * change-request lifecycle notifications. A legacy implicit owner
   * (ownerUserId without a membership row) is included with a null email.
   */
  async resolveApprovers(projectId: string): Promise<RecipientRef[]> {
    const [members, project] = await Promise.all([
      this.prisma.projectMember.findMany({
        where: { projectId, role: { in: [ProjectRole.ADMIN, ProjectRole.OWNER] } },
        select: { userId: true, email: true },
      }),
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerUserId: true },
      }),
    ]);

    const refs: RecipientRef[] = members.map((m) => ({ userId: m.userId, email: m.email }));
    const owner = project?.ownerUserId;
    if (owner && !refs.some((r) => r.userId === owner)) {
      refs.push({ userId: owner, email: null });
    }
    return refs;
  }

  private async deliverTo(
    request: NotificationRequest,
    recipient: RecipientRef,
  ): Promise<NotificationOutcome> {
    const eventKey = `${request.eventKey}:${recipient.userId}`;

    // Dedup claim: creating the row IS the claim; a unique violation means
    // this event+recipient was already delivered and must not repeat.
    const claimed = await this.prisma.notificationLog
      .create({
        data: {
          eventKey,
          type: request.type,
          projectId: request.projectId,
          entityType: request.entityType,
          entityId: request.entityId,
          recipientUserId: recipient.userId,
          recipientEmail: recipient.email,
          provider: this.provider.name,
          status: NotificationStatus.PENDING,
        },
      })
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return null; // duplicate — already notified for this event
        }
        throw error;
      });

    if (!claimed) return 'SKIPPED';

    try {
      await this.provider.send({
        to: recipient.email,
        toUserId: recipient.userId,
        subject: request.subject,
        body: request.body,
      });
      await this.prisma.notificationLog.update({
        where: { id: claimed.id },
        data: { status: NotificationStatus.SENT, error: null },
      });
      return 'SENT';
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Notification ${request.type} to ${recipient.userId} failed: ${message}`,
      );
      await this.prisma.notificationLog
        .update({
          where: { id: claimed.id },
          data: { status: NotificationStatus.FAILED, error: message.slice(0, 2000) },
        })
        .catch((updateError) => {
          this.logger.error(
            `Failed to record notification failure: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
          );
        });
      return 'FAILED';
    }
  }
}
