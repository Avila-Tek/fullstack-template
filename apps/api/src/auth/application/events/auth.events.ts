// Zero framework imports — plain TS event classes.
// AuditLogListener listens on 'auth.*' and reads these shapes.

export interface AuthEventPayload {
  userId?: string;
  email?: string;
  sessionId?: string;
  ip?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export class AuthSignedUpEvent {
  readonly type = 'auth.signed_up' as const;
  constructor(public readonly payload: AuthEventPayload) {}
}

export class AuthSignedInEvent {
  readonly type = 'auth.signed_in' as const;
  constructor(public readonly payload: AuthEventPayload) {}
}

export class AuthSignedOutEvent {
  readonly type = 'auth.signed_out' as const;
  constructor(public readonly payload: AuthEventPayload) {}
}

export type AuthEvent =
  | AuthSignedUpEvent
  | AuthSignedInEvent
  | AuthSignedOutEvent;
