export abstract class BruteForcePort {
  /** Increment counter for email; returns new count */
  abstract increment(email: string): Promise<number>;
  /** Reset counter after successful login */
  abstract clear(email: string): Promise<void>;
  /** Read current count without incrementing */
  abstract getCount(email: string): Promise<number>;
}
