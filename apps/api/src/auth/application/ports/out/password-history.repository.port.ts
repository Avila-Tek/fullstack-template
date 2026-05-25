export interface PasswordHistoryEntry {
  id: string;
  userId: string;
  hashedPassword: string;
  createdAt: Date;
}

export abstract class PasswordHistoryRepositoryPort {
  abstract findLastN(userId: string, n: number): Promise<PasswordHistoryEntry[]>;
  abstract add(userId: string, hashedPassword: string): Promise<void>;
  abstract pruneOldest(userId: string, keepCount: number): Promise<void>;
}
