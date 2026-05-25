import { DomainException } from '@shared/domain-exception.js';

export class EmailDeliveryFailedException extends DomainException {
  constructor(meta?: Record<string, unknown>) {
    super('AUTH_EMAIL_DELIVERY_FAILED', meta);
  }
}
