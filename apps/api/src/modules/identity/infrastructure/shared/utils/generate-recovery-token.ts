import { createHmac, timingSafeEqual } from 'node:crypto';

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Spec §9: generate a signed, time-limited recovery token embedded in the alert email.
// Format (base64url): `userId:timestamp:hmac-sha256-hex`
export function generateRecoveryToken(userId: string, secret: string): string {
	const timestamp = Date.now().toString();
	const payload = `${userId}:${timestamp}`;
	const sig = createHmac('sha256', secret).update(payload).digest('hex');
	return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export type RecoveryTokenResult =
	| { valid: true; userId: string }
	| { valid: false; error: string };

export function validateRecoveryToken(
	token: string,
	secret: string,
): RecoveryTokenResult {
	let decoded: string;
	try {
		decoded = Buffer.from(token, 'base64url').toString('utf8');
	} catch {
		return { valid: false, error: 'Invalid token encoding.' };
	}

	const colonIndex = decoded.lastIndexOf(':');
	if (colonIndex === -1)
		return { valid: false, error: 'Invalid token structure.' };

	const sig = decoded.slice(colonIndex + 1);
	const payload = decoded.slice(0, colonIndex);

	const firstColon = payload.indexOf(':');
	if (firstColon === -1)
		return { valid: false, error: 'Invalid token structure.' };

	const userId = payload.slice(0, firstColon);
	const timestamp = payload.slice(firstColon + 1);

	if (!userId || !timestamp)
		return { valid: false, error: 'Invalid token structure.' };

	// Constant-time HMAC comparison — prevents timing attacks
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

	if (Date.now() - Number(timestamp) > EXPIRY_MS) {
		return { valid: false, error: 'Token has expired.' };
	}

	return { valid: true, userId };
}
