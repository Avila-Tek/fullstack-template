import { describe, expect, it } from 'vitest';
import {
  calculateNationalPricingCommandSchema,
  nationalPricingResponseSchema,
  nationalQuoteLimitsResponseSchema,
} from '../../src/pricing/national-guide-pricing.dto';

// Valid UUIDv4 fixtures (version nibble = 4, variant nibble in [89abAB]).
const DEST_CITY = '11111111-1111-4111-9111-111111111111';
const DEST_OFFICE = '22222222-2222-4222-9222-222222222222';
const ORIGIN_CITY = '33333333-3333-4333-9333-333333333333';

describe('calculateNationalPricingCommandSchema', () => {
  it('accepts the home-delivery happy path with default declaredValueUsd=0', () => {
    const parsed = calculateNationalPricingCommandSchema.parse({
      paymentType: 'origin',
      destinationType: 'home',
      weightKg: 1.5,
      originCityId: ORIGIN_CITY,
      destinationCityId: DEST_CITY,
    });

    expect(parsed.declaredValueUsd).toBe(0);
    expect(parsed.destinationOfficeId).toBeUndefined();
    expect(parsed.originCityId).toBe(ORIGIN_CITY);
  });

  it('accepts the office-pickup happy path with COD + declared value', () => {
    const parsed = calculateNationalPricingCommandSchema.parse({
      paymentType: 'destination',
      destinationType: 'office',
      weightKg: 5,
      declaredValueUsd: 100,
      originCityId: ORIGIN_CITY,
      destinationCityId: DEST_CITY,
      destinationOfficeId: DEST_OFFICE,
      productType: 'package',
    });

    expect(parsed.destinationOfficeId).toBe(DEST_OFFICE);
    expect(parsed.declaredValueUsd).toBe(100);
  });

  it('rejects office-pickup without destinationOfficeId (AC: 400 case)', () => {
    const result = calculateNationalPricingCommandSchema.safeParse({
      paymentType: 'origin',
      destinationType: 'office',
      weightKg: 1,
      originCityId: ORIGIN_CITY,
      destinationCityId: DEST_CITY,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.join('.') === 'destinationOfficeId'
        )
      ).toBe(true);
    }
  });

  it('rejects when originCityId is missing (client must select an origin city)', () => {
    const result = calculateNationalPricingCommandSchema.safeParse({
      paymentType: 'origin',
      destinationType: 'home',
      weightKg: 1,
      destinationCityId: DEST_CITY,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.join('.') === 'originCityId'
        )
      ).toBe(true);
    }
  });

  it('rejects non-UUID originCityId', () => {
    const result = calculateNationalPricingCommandSchema.safeParse({
      paymentType: 'origin',
      destinationType: 'home',
      weightKg: 1,
      originCityId: 'not-a-uuid',
      destinationCityId: DEST_CITY,
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid paymentType', () => {
    const result = calculateNationalPricingCommandSchema.safeParse({
      paymentType: 'prepaid',
      destinationType: 'home',
      weightKg: 1,
      originCityId: ORIGIN_CITY,
      destinationCityId: DEST_CITY,
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid destinationType', () => {
    const result = calculateNationalPricingCommandSchema.safeParse({
      paymentType: 'origin',
      destinationType: 'pickup',
      weightKg: 1,
      originCityId: ORIGIN_CITY,
      destinationCityId: DEST_CITY,
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid productType', () => {
    const result = calculateNationalPricingCommandSchema.safeParse({
      paymentType: 'origin',
      destinationType: 'home',
      weightKg: 1,
      originCityId: ORIGIN_CITY,
      destinationCityId: DEST_CITY,
      productType: 'M',
    });

    expect(result.success).toBe(false);
  });

  it('rejects zero or negative weightKg', () => {
    for (const weightKg of [0, -1]) {
      const result = calculateNationalPricingCommandSchema.safeParse({
        paymentType: 'origin',
        destinationType: 'home',
        weightKg,
        originCityId: ORIGIN_CITY,
        destinationCityId: DEST_CITY,
      });
      expect(result.success).toBe(false);
    }
  });

  it('rejects negative declaredValueUsd', () => {
    const result = calculateNationalPricingCommandSchema.safeParse({
      paymentType: 'origin',
      destinationType: 'home',
      weightKg: 1,
      declaredValueUsd: -1,
      originCityId: ORIGIN_CITY,
      destinationCityId: DEST_CITY,
    });

    expect(result.success).toBe(false);
  });

  it('rejects non-UUID destinationCityId', () => {
    const result = calculateNationalPricingCommandSchema.safeParse({
      paymentType: 'origin',
      destinationType: 'home',
      weightKg: 1,
      originCityId: ORIGIN_CITY,
      destinationCityId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });
});

describe('nationalQuoteLimitsResponseSchema', () => {
  it('parses a happy-path response with USD bounds', () => {
    const parsed = nationalQuoteLimitsResponseSchema.parse({
      weightKg: { max: 30 },
      declaredValueUsd: { min: 2, max: 100 },
    });
    expect(parsed.declaredValueUsd?.max).toBe(100);
  });

  it('allows null declaredValueUsd bounds', () => {
    const parsed = nationalQuoteLimitsResponseSchema.parse({
      weightKg: { max: 30 },
      declaredValueUsd: null,
    });
    expect(parsed.declaredValueUsd).toBeNull();
  });
});

describe('nationalPricingResponseSchema', () => {
  it('accepts a full happy-path response shape', () => {
    const parsed = nationalPricingResponseSchema.parse({
      baseFreight: 1607.27,
      overweight: 0,
      transportCharge: 0,
      freight: 1607.27,
      commission: 0,
      insurance: 0,
      subtotal: 1607.27,
      vat: 257.16,
      vatPercentage: 16,
      postalTax: 128.58,
      total: 1993.01,
      bcvRate: 36.5,
      totalUsd: 54.6,
      transitEstimate: { merchandiseDays: 3, documentDays: 1 },
      detail: {
        overweightHalfKilos: 0,
        weightTypeCode: 1,
        baseTypeCode: 0,
        overweightTypeCode: 0,
        complementPercentage: 0,
        transportChargeRuleId: 'tcr-1',
      },
    });

    expect(parsed.total).toBe(1993.01);
  });

  it('allows transitEstimate to be null (AC-06 non-blocking case)', () => {
    const parsed = nationalPricingResponseSchema.parse({
      baseFreight: 1,
      overweight: 0,
      transportCharge: 0,
      freight: 1,
      commission: 0,
      insurance: 0,
      subtotal: 1,
      vat: 0,
      vatPercentage: 0,
      postalTax: 0,
      total: 1,
      bcvRate: 36.5,
      totalUsd: 0.03,
      transitEstimate: null,
      detail: {
        overweightHalfKilos: 0,
        weightTypeCode: 1,
        baseTypeCode: 0,
        overweightTypeCode: 0,
        complementPercentage: 0,
        transportChargeRuleId: null,
      },
    });

    expect(parsed.transitEstimate).toBeNull();
  });

  it('allows merchandiseDays and documentDays to be null individually', () => {
    const parsed = nationalPricingResponseSchema.parse({
      baseFreight: 1,
      overweight: 0,
      transportCharge: 0,
      freight: 1,
      commission: 0,
      insurance: 0,
      subtotal: 1,
      vat: 0,
      vatPercentage: 0,
      postalTax: 0,
      total: 1,
      bcvRate: 36.5,
      totalUsd: 0.03,
      transitEstimate: { merchandiseDays: null, documentDays: 2 },
      detail: {
        overweightHalfKilos: 0,
        weightTypeCode: 1,
        baseTypeCode: 0,
        overweightTypeCode: 0,
        complementPercentage: 0,
        transportChargeRuleId: null,
      },
    });

    expect(parsed.transitEstimate?.merchandiseDays).toBeNull();
    expect(parsed.transitEstimate?.documentDays).toBe(2);
  });
});
