/**
 * Seed script — bootstraps the platform admin user and initial registered systems.
 *
 * Uses raw Drizzle (no NestJS DI). Safe to run multiple times (idempotent).
 * Wraps the work in a session-scoped pg advisory lock so concurrent Cloud Run
 * instances cannot race on inserts at startup.
 *
 * Required env vars:
 *   AUTH_DATABASE_URL          — PostgreSQL connection string
 *   SEED_PLATFORM_ADMIN_EMAIL  — email of the platform admin account
 *   SEED_PLATFORM_ADMIN_NAME   — display name
 *   SEED_PLATFORM_ADMIN_PASSWORD — plain-text password (hashed here via Argon2)
 *
 * Optional env vars:
 *   SEED_SYSTEMS — JSON array of system descriptors, e.g.:
 *     '[{"name":"My App","slug":"my-app","apiBaseUrl":"https://api.myapp.com","accessModel":"open"}]'
 *
 *     Each descriptor may include an optional `apiKey` field. When provided,
 *     the seed uses that exact value (the orchestrator and clients can be
 *     pre-configured to send the same value). When absent, a random 32-byte
 *     hex key is generated and printed once. The key is HMAC-hashed before
 *     storage either way.
 */

import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { normalizeEmail } from '@zoom/utils';
import * as argon2 from 'argon2';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env, loadEnv } from '../env';
import * as schema from '../infrastructure/database/db-schema';

// Stable advisory-lock key for the seed script (any unique BIGINT works).
const SEED_ADVISORY_LOCK_KEY = 731_197_331_197n;

interface SystemDescriptor {
	name: string;
	slug: string;
	apiBaseUrl: string;
	accessModel: 'open' | 'restricted';
	/**
	 * Optional fixed API key. When provided, the seed uses this exact value
	 * instead of generating a random one. Useful when the orchestrator and
	 * the client need to know the key in advance. Value is still HMAC-hashed
	 * before storage.
	 */
	apiKey?: string;
}

function requireEnv(key: string): string {
	const value = process.env[key];
	if (!value) throw new Error(`Missing required env var: ${key}`);
	return value;
}

function generateApiKey(fixedKey?: string): {
	rawKey: string;
	keyPrefix: string;
	keyHash: string;
} {
	const rawKey = fixedKey ?? randomBytes(32).toString('hex');
	const hmacSecret = env.API_KEY_HMAC_SECRET;
	return {
		rawKey,
		keyPrefix: rawKey.slice(0, 8),
		keyHash: createHmac('sha256', hmacSecret).update(rawKey).digest('hex'),
	};
}

async function updateExistingSystem(
	db: ReturnType<typeof drizzle<typeof schema>>,
	existingSystem: { id: string; organizationId: string },
	descriptor: SystemDescriptor,
): Promise<void> {
	const { name, slug, apiBaseUrl, accessModel } = descriptor;
	const rotatedKey = descriptor.apiKey
		? generateApiKey(descriptor.apiKey)
		: null;

	await db.transaction(async (tx) => {
		await tx
			.update(schema.system)
			.set({ name, apiBaseUrl, accessModel })
			.where(eq(schema.system.id, existingSystem.id));

		await tx
			.update(schema.organization)
			.set({ name })
			.where(eq(schema.organization.id, existingSystem.organizationId));

		if (!rotatedKey) return;

		// Revoke any currently-active keys whose hash differs from the new one.
		await tx
			.update(schema.systemApiKey)
			.set({ revokedAt: new Date() })
			.where(
				and(
					eq(schema.systemApiKey.systemId, existingSystem.id),
					isNull(schema.systemApiKey.revokedAt),
					ne(schema.systemApiKey.keyHash, rotatedKey.keyHash),
				),
			);

		// Upsert the desired key as active. If the same hash was previously
		// revoked, clear revokedAt so it becomes active again.
		await tx
			.insert(schema.systemApiKey)
			.values({
				id: randomUUID(),
				systemId: existingSystem.id,
				keyHash: rotatedKey.keyHash,
				keyPrefix: rotatedKey.keyPrefix,
			})
			.onConflictDoUpdate({
				target: schema.systemApiKey.keyHash,
				set: { revokedAt: null },
			});
	});

	console.log(`✅ Updated system "${name}" (slug="${slug}")`);
	if (rotatedKey) {
		console.log(
			`   API Key   : ${rotatedKey.rawKey}  (fixed key from SEED_SYSTEMS — set as active)`,
		);
		console.log(`   Key prefix: ${rotatedKey.keyPrefix}`);
	}
}

async function createNewSystem(
	db: ReturnType<typeof drizzle<typeof schema>>,
	platformAdminId: string,
	descriptor: SystemDescriptor,
): Promise<void> {
	const { name, slug, apiBaseUrl, accessModel } = descriptor;
	const systemId = randomUUID();
	const organizationId = randomUUID();
	const { rawKey, keyPrefix, keyHash } = generateApiKey(descriptor.apiKey);

	await db.transaction(async (tx) => {
		await tx.insert(schema.organization).values({
			id: organizationId,
			name,
			slug,
		});

		await tx.insert(schema.member).values({
			id: randomUUID(),
			organizationId,
			userId: platformAdminId,
			role: 'owner',
		});

		await tx.insert(schema.system).values({
			id: systemId,
			name,
			slug,
			apiBaseUrl,
			accessModel,
			organizationId,
		});

		await tx.insert(schema.systemMembership).values({
			id: randomUUID(),
			systemId,
			organizationId,
			userId: platformAdminId,
			role: 'owner',
			status: 'active',
		});

		await tx.insert(schema.systemApiKey).values({
			id: randomUUID(),
			systemId,
			keyHash,
			keyPrefix,
		});
	});

	console.log(`✅ Created system "${name}" (slug="${slug}")`);
	console.log(`   System ID : ${systemId}`);
	if (descriptor.apiKey) {
		console.log(
			`   API Key   : ${rawKey}  (fixed key from SEED_SYSTEMS — already known)`,
		);
	} else {
		console.log(`   API Key   : ${rawKey}  ← save this, shown only once`);
	}
	console.log(`   Key prefix: ${keyPrefix}`);
}

async function main(): Promise<void> {
	await loadEnv();

	const databaseUrl = requireEnv('AUTH_DATABASE_URL');
	const adminEmail = requireEnv('SEED_PLATFORM_ADMIN_EMAIL');
	const adminName = requireEnv('SEED_PLATFORM_ADMIN_NAME');
	const adminPassword = requireEnv('SEED_PLATFORM_ADMIN_PASSWORD');

	const rawSystems = process.env.SEED_SYSTEMS;
	const systems: SystemDescriptor[] = rawSystems ? JSON.parse(rawSystems) : [];

	const pool = new Pool({ connectionString: databaseUrl });

	// Acquire a session-scoped advisory lock; if another instance holds it, skip
	// rather than block (every instance attempts the seed at startup).
	const lockResult = await pool.query<{ acquired: boolean }>(
		'SELECT pg_try_advisory_lock($1::bigint) AS acquired',
		[SEED_ADVISORY_LOCK_KEY.toString()],
	);
	if (!lockResult.rows[0]?.acquired) {
		console.log('ℹ️  Another instance is seeding — skipping.');
		await pool.end();
		return;
	}

	const db = drizzle(pool, { schema });

	console.log('🌱 Starting seed…');

	try {
		let platformAdminId: string;

		const [existingUser] = await db
			.select({ id: schema.user.id, platformAdmin: schema.user.platformAdmin })
			.from(schema.user)
			.where(eq(schema.user.normalizedEmail, normalizeEmail(adminEmail)))
			.limit(1);

		if (existingUser) {
			platformAdminId = existingUser.id;
			if (!existingUser.platformAdmin) {
				await db
					.update(schema.user)
					.set({ platformAdmin: true })
					.where(eq(schema.user.id, platformAdminId));
				console.log(
					`✅ Promoted existing user to platform admin: ${adminEmail}`,
				);
			} else {
				console.log(`ℹ️  Platform admin already exists: ${adminEmail}`);
			}
		} else {
			platformAdminId = randomUUID();
			const passwordHash = await argon2.hash(adminPassword, {
				type: argon2.argon2id,
				memoryCost: 65536,
				timeCost: 3,
				parallelism: 4,
			});

			await db.transaction(async (tx) => {
				await tx.insert(schema.user).values({
					id: platformAdminId,
					email: adminEmail,
					fullName: adminName,
					emailVerified: true, // seed bypasses verification flow
					normalizedEmail: normalizeEmail(adminEmail),
					twoFactorEnabled: false,
					platformAdmin: true,
				});

				await tx.insert(schema.account).values({
					id: randomUUID(),
					accountId: platformAdminId,
					providerId: 'credential',
					userId: platformAdminId,
					password: passwordHash,
				});
			});

			console.log(`✅ Created platform admin: ${adminEmail}`);
		}

		if (systems.length === 0) {
			console.log('ℹ️  No SEED_SYSTEMS defined — skipping system seed.');
		}

		for (const descriptor of systems) {
			const [existingSystem] = await db
				.select({
					id: schema.system.id,
					organizationId: schema.system.organizationId,
				})
				.from(schema.system)
				.where(eq(schema.system.slug, descriptor.slug))
				.limit(1);

			if (existingSystem) {
				await updateExistingSystem(db, existingSystem, descriptor);
				continue;
			}

			await createNewSystem(db, platformAdminId, descriptor);
		}

		const seededSystems = await db
			.select({
				id: schema.system.id,
				name: schema.system.name,
				slug: schema.system.slug,
			})
			.from(schema.system)
			.where(eq(schema.system.isDeleted, false));

		if (seededSystems.length === 0) {
			console.log('ℹ️  No active systems found — skipping system terms seed.');
		}

		for (const sys of seededSystems) {
			const [existingTerms] = await db
				.select({ id: schema.systemTerms.id })
				.from(schema.systemTerms)
				.where(
					sql`${schema.systemTerms.systemId} = ${sys.id} AND ${schema.systemTerms.version} = '0'`,
				)
				.limit(1);

			if (existingTerms) {
				console.log(
					`ℹ️  Terms v0 already exist for system "${sys.slug}" — skipping.`,
				);
				continue;
			}

			await db.insert(schema.systemTerms).values({
				systemId: sys.id,
				version: '0',
				status: 'active',
				title: 'Términos y Condiciones de Uso',
				content: 'Estos son los términos y condiciones de uso',
				effectiveAt: new Date('2025-01-01T00:00:00.000Z'),
				createdByUserId: platformAdminId,
			});

			console.log(`✅ Created terms v0 for system "${sys.slug}"`);
		}

		console.log('✅ Seed complete.');
	} finally {
		await pool.query('SELECT pg_advisory_unlock($1::bigint)', [
			SEED_ADVISORY_LOCK_KEY.toString(),
		]);
		await pool.end();
	}
}

main().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
