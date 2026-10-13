import { Injectable, Logger } from '@nestjs/common';
import type { NotificationDelivery, NotificationProvider } from './notification-provider.interface';

/**
 * Dev-safe default provider (Phase 15): every notification is written to
 * the application log. Always active so the notification pipeline is
 * exercisable without email configuration; never a marketing channel.
 */
@Injectable()
export class LogNotificationProvider implements NotificationProvider {
  readonly name = 'log';
  private readonly logger = new Logger('Notifications');

  async send(delivery: NotificationDelivery): Promise<void> {
    this.logger.log(
      `→ ${delivery.toUserId}${delivery.to ? ` <${delivery.to}>` : ''} — ${delivery.subject}: ${delivery.body}`,
    );
  }
}
