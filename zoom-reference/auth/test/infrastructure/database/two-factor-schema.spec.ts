// Phase 1 TDD — verifies twoFactorEventTypeEnum is exported with correct values.
import { describe, expect, it } from 'vitest';
import { twoFactorEventTypeEnum } from '../../../src/infrastructure/database/schema/two-factor-audit-log.schema';

describe('two-factor schema', () => {
	it('exports twoFactorEventTypeEnum with all expected event types', () => {
		const values: string[] = [...twoFactorEventTypeEnum.enumValues];
		expect(values).toContain('2fa_setup_enrolled');
		expect(values).toContain('2fa_setup_skipped');
		expect(values).toContain('2fa_otp_send_rate_limited');
		expect(values).toContain('2fa_totp_replay_rejected');
	});
});
