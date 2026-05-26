export interface PendingMethodPayload {
	method: 'email' | 'sms';
	phoneNumber?: string;
}

export abstract class TwoFactorPendingMethodPort {
	abstract set(
		userId: string,
		payload: PendingMethodPayload,
		ttlSeconds: number,
	): Promise<void>;
	abstract get(userId: string): Promise<PendingMethodPayload | null>;
	abstract delete(userId: string): Promise<void>;
}
