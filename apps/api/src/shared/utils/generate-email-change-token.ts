import { createHmac, timingSafeEqual } from 'node:crypto';

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateEmailChangeToken(
	userId: string,
	newEmail: string,
	secret: string,
): string {
	const payload = Buffer.from(
		JSON.stringify({ userId, newEmail, timestamp: Date.now() }),
	).toString('base64url');
	const sig = createHmac('sha256', secret).update(payload).digest('hex');
	return `${payload}.${sig}`;
}

export type EmailChangeTokenResult =
	| { valid: true; userId: string; newEmail: string }
	| { valid: false; error: string };

export function validateEmailChangeToken(
	token: string,
	secret: string,
): EmailChangeTokenResult {
	const dotIndex = token.lastIndexOf('.');
	if (dotIndex === -1)
		return { valid: false, error: 'Invalid token structure.' };

	const payload = token.slice(0, dotIndex);
	const sig = token.slice(dotIndex + 1);

	const expectedSig = createHmac('sha256', secret)
		.update(payload)
		.digest('hex');
	const sigBuf = Buffer.from(sig, 'hex');
	const expectedBuf = Buffer.from(expectedSig, 'hex');

	if (
		sigBuf.length !== expectedBuf.length ||
		!timingSafeEqual(sigBuf, expectedBuf)
	) {
		return { valid: false, error: 'Invalid token signature.' };
	}

	let parsed: { userId?: string; newEmail?: string; timestamp?: number };
	try {
		parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
			userId?: string;
			newEmail?: string;
			timestamp?: number;
		};
	} catch {
		return { valid: false, error: 'Invalid token payload.' };
	}

	const { userId, newEmail, timestamp } = parsed;
	if (!userId || !newEmail || !timestamp) {
		return { valid: false, error: 'Invalid token structure.' };
	}

	if (Date.now() - timestamp > EXPIRY_MS) {
		return { valid: false, error: 'Token has expired.' };
	}

	return { valid: true, userId, newEmail };
}
