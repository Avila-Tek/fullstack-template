import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { customType } from 'drizzle-orm/pg-core';
import { env } from '../../env';

const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;
const getKey = (): Buffer => {
	if (cachedKey) return cachedKey;
	const hex = env.PII_ENCRYPTION_KEY;
	if (!hex)
		throw new Error('PII_ENCRYPTION_KEY env var is required for PII columns');
	cachedKey = Buffer.from(hex, 'hex');
	return cachedKey;
};

const encrypt = (plain: string): string => {
	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
	const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
	return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
};

const decrypt = (payload: string): string => {
	const buf = Buffer.from(payload, 'base64');
	const decipher = createDecipheriv(
		'aes-256-gcm',
		getKey(),
		buf.subarray(0, IV_LEN),
	);
	decipher.setAuthTag(buf.subarray(IV_LEN, IV_LEN + TAG_LEN));
	return Buffer.concat([
		decipher.update(buf.subarray(IV_LEN + TAG_LEN)),
		decipher.final(),
	]).toString('utf8');
};

export const encryptedText = customType<{
	data: string;
	driverData: string;
}>({
	dataType: () => 'text',
	toDriver: encrypt,
	fromDriver: decrypt,
});
