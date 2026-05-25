import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type {
	DeviceRepositoryPort,
	UpsertDeviceResult,
} from '../../../application/ports/out/device-repository.port';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

// Applied before any insert or index lookup to prevent oversized entries.
const MAX_USER_AGENT_LENGTH = 512;

@Injectable()
export class DrizzleDeviceRepositoryAdapter implements DeviceRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async upsert(params: {
		userId: string;
		deviceName: string;
		deviceType: string;
		userAgent: string;
		ipAddress: string;
	}): Promise<UpsertDeviceResult> {
		// Truncate to the schema limit so crafted headers can't produce oversized index entries.
		const userAgent = params.userAgent.slice(0, MAX_USER_AGENT_LENGTH);
		const id = crypto.randomUUID();
		const now = new Date();

		return this.db.transaction(async (tx) => {
			// SELECT FOR UPDATE locks any pre-existing row so concurrent logins from the
			// same (userId, userAgent) cannot both read "no existing row" and both fire a
			// new-device alert (TOCTOU fix).
			const [existing] = await tx
				.select({ ipAddress: schema.device.ipAddress })
				.from(schema.device)
				.where(
					and(
						eq(schema.device.userId, params.userId),
						eq(schema.device.userAgent, userAgent),
					),
				)
				.for('update')
				.limit(1);

			const rows = await tx
				.insert(schema.device)
				.values({
					id,
					userId: params.userId,
					deviceName: params.deviceName,
					deviceType: params.deviceType,
					userAgent,
					ipAddress: params.ipAddress,
					lastLoginAt: now,
					createdAt: now,
				})
				.onConflictDoUpdate({
					target: [schema.device.userId, schema.device.userAgent],
					set: { ipAddress: params.ipAddress, lastLoginAt: now },
				})
				.returning({ id: schema.device.id });

			const row = rows[0];
			// Fresh INSERT returns our generated id; ON CONFLICT DO UPDATE returns
			// the pre-existing row's id — so equality tells us which path was taken.
			return {
				id: row?.id ?? id,
				isNew: row?.id === id,
				previousIpAddress: existing?.ipAddress,
			};
		});
	}

	async touchDevice(params: {
		id: string;
		userId: string;
		userAgent: string;
		deviceName: string;
		deviceType: string;
		ipAddress: string;
	}): Promise<{ id: string } | null> {
		const userAgent = params.userAgent.slice(0, MAX_USER_AGENT_LENGTH);
		const [row] = await this.db
			.update(schema.device)
			.set({
				ipAddress: params.ipAddress,
				userAgent,
				deviceName: params.deviceName,
				deviceType: params.deviceType,
				lastLoginAt: new Date(),
			})
			.where(
				and(
					eq(schema.device.id, params.id),
					eq(schema.device.userId, params.userId),
				),
			)
			.returning({ id: schema.device.id });

		return row ?? null;
	}
}
