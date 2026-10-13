import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { LogNotificationProvider } from './log-notification.provider';

/**
 * Notification module (Phase 15) — global so verification and change-request
 * flows can inject NotificationsService without wiring. Provider selection
 * happens inside NotificationsService (Resend when configured, dev log
 * provider otherwise).
 */
@Global()
@Module({
  providers: [NotificationsService, LogNotificationProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
