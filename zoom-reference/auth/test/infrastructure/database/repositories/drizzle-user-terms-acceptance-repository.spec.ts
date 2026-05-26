import { describe, expect, it, vi } from 'vitest';
import type { CreateUserTermsAcceptanceInput } from '../../../../src/application/ports/out/user-terms-acceptance-repository.port';
import * as schema from '../../../../src/infrastructure/database/db-schema';
import { DrizzleUserTermsAcceptanceRepository } from '../../../../src/infrastructure/database/repositories/drizzle-user-terms-acceptance-repository.adapter';

// ---------------------------------------------------------------------------
// DB mock — minimal Drizzle insert chain with onConflictDoNothing
// ---------------------------------------------------------------------------

function makeDb() {
	const onConflictDoNothingFn = vi.fn().mockResolvedValue(undefined);
	const valuesFn = vi
		.fn()
		.mockReturnValue({ onConflictDoNothing: onConflictDoNothingFn });
	const insertFn = vi.fn().mockReturnValue({ values: valuesFn });
	return {
		db: { insert: insertFn },
		insertFn,
		valuesFn,
		onConflictDoNothingFn,
	};
}

const VALID_INPUT: CreateUserTermsAcceptanceInput = {
	userId: 'user-123',
	systemId: 'system-id',
	systemTermsId: 'terms-id',
	sessionId: null,
	ipAddress: '1.2.3.4',
	userAgent: 'Mozilla/5.0',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DrizzleUserTermsAcceptanceRepository.create()', () => {
	it('calls db.insert with the userTermsAcceptance table', async () => {
		const { db, insertFn } = makeDb();
		const repo = new DrizzleUserTermsAcceptanceRepository(db as never);

		await repo.create(VALID_INPUT);

		expect(insertFn).toHaveBeenCalledWith(schema.userTermsAcceptance);
	});

	it('passes all input fields to values()', async () => {
		const { db, valuesFn } = makeDb();
		const repo = new DrizzleUserTermsAcceptanceRepository(db as never);

		await repo.create(VALID_INPUT);

		expect(valuesFn).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'user-123',
				systemId: 'system-id',
				systemTermsId: 'terms-id',
				sessionId: null,
				userAgent: 'Mozilla/5.0',
			}),
		);
	});

	it('calls onConflictDoNothing() for idempotent behavior', async () => {
		const { db, onConflictDoNothingFn } = makeDb();
		const repo = new DrizzleUserTermsAcceptanceRepository(db as never);

		await repo.create(VALID_INPUT);

		expect(onConflictDoNothingFn).toHaveBeenCalledOnce();
	});

	it('coerces null ipAddress to undefined (inet column rejects null differently than undefined)', async () => {
		const { db, valuesFn } = makeDb();
		const repo = new DrizzleUserTermsAcceptanceRepository(db as never);

		await repo.create({ ...VALID_INPUT, ipAddress: null, userAgent: null });

		const insertedRow = (valuesFn as ReturnType<typeof vi.fn>).mock
			.calls[0][0] as Record<string, unknown>;
		expect(insertedRow.ipAddress).toBeUndefined();
		expect(insertedRow.userAgent).toBeUndefined();
	});
});
