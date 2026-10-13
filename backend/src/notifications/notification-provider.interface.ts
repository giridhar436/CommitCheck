/**
 * Delivery abstraction (Phase 15). The orchestration (dedup, status
 * recording, failure isolation) lives in NotificationsService; a provider
 * only does one thing — attempt a single delivery, or throw.
 */
export interface NotificationDelivery {
  /** Recipient email; null when the caller has no address on file. */
  to: string | null;
  /** Recipient Supabase user id (for the dev log provider / audit context). */
  toUserId: string;
  subject: string;
  body: string;
}

export interface NotificationProvider {
  /** Stable identifier persisted on notification_log.provider rows. */
  readonly name: string;
  /** Attempts one delivery. Throw to record a FAILED row — never blocked, never retried here. */
  send(delivery: NotificationDelivery): Promise<void>;
}
