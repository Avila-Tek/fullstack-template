export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

export abstract class SessionRepositoryPort {
  abstract findById(sessionId: string): Promise<SessionRecord | null>;
  abstract deleteById(sessionId: string): Promise<void>;
  abstract deleteByUserId(userId: string, exceptSessionId?: string): Promise<void>;
}
