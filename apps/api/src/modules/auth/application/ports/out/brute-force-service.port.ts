// Outbound port — tracks failed login attempts per key for brute-force protection.
// Implemented by RedisBruteForceAdapter (Redis primary, rate_limit DB fallback).

export abstract class BruteForceServicePort {
	abstract increment(key: string): Promise<number>;
	abstract getCount(key: string): Promise<number>;
	abstract clear(key: string): Promise<void>;
}
