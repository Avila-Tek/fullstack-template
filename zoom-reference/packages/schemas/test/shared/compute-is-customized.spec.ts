import { describe, expect, it } from 'vitest';
import {
  computeIsCustomized,
  type TServicePermissionInput,
} from '../../src/shared/permission-set.schema';

const TEMPLATE = [
  { key: 'national_guia_origin' as const, enabled: true },
  { key: 'national_guia_destination' as const, enabled: false },
  { key: 'national_locker' as const, enabled: true },
  { key: 'international' as const, enabled: false },
];

function makeInput(
  overrides: Array<{ key: TServicePermissionInput['key']; enabled: boolean }>
): TServicePermissionInput[] {
  return overrides.map((o) => ({
    ...o,
    whitelistEnabled: false,
    recipientIds: [],
  }));
}

describe('computeIsCustomized', () => {
  it('returns false when all keys match the template exactly', () => {
    const input = makeInput(
      TEMPLATE.map((t) => ({ key: t.key, enabled: t.enabled }))
    );
    expect(computeIsCustomized(input, TEMPLATE)).toBe(false);
  });

  it('returns true when a submitted key has a different enabled flag', () => {
    const input = makeInput([
      { key: 'national_guia_origin', enabled: false }, // differs
      { key: 'national_guia_destination', enabled: false },
      { key: 'national_locker', enabled: true },
      { key: 'international', enabled: false },
    ]);
    expect(computeIsCustomized(input, TEMPLATE)).toBe(true);
  });

  it('returns true when submission has fewer keys than the template', () => {
    const input = makeInput([
      { key: 'national_guia_origin', enabled: true },
      { key: 'national_guia_destination', enabled: false },
      // national_locker and international are omitted
    ]);
    expect(computeIsCustomized(input, TEMPLATE)).toBe(true);
  });

  it('returns true when submission has more keys than the template', () => {
    const extra = makeInput([
      ...TEMPLATE.map((t) => ({ key: t.key, enabled: t.enabled })),
    ]);
    // Simulate a template with only 3 keys
    const shortTemplate = TEMPLATE.slice(0, 3);
    expect(computeIsCustomized(extra, shortTemplate)).toBe(true);
  });

  it('returns true when submission is empty but template has services', () => {
    expect(computeIsCustomized([], TEMPLATE)).toBe(true);
  });

  it('returns true when template is null', () => {
    const input = makeInput([{ key: 'national_guia_origin', enabled: true }]);
    expect(computeIsCustomized(input, null)).toBe(true);
  });

  it('returns false when both submission and template are empty', () => {
    expect(computeIsCustomized([], [])).toBe(false);
  });

  it('returns true when a submitted key is not in the template', () => {
    const input = makeInput([
      { key: 'national_guia_origin', enabled: true },
      { key: 'national_guia_destination', enabled: false },
      { key: 'national_locker', enabled: true },
      { key: 'international', enabled: true }, // key present but different value
    ]);
    expect(computeIsCustomized(input, TEMPLATE)).toBe(true);
  });
});
