import { describe, expect, it } from 'vitest';
import {
  BannerItemSchema,
  BannerManifestSchema,
} from '../../src/banner/banner.schema';

const validItem = {
  id: 'b1',
  imageUrl: 'https://example.com/img.jpg',
  linkUrl: null,
  order: 1,
  status: 'published' as const,
  title: 'Banner',
  type: 'mobile' as const,
};

describe('BannerItemSchema', () => {
  it('accepts a valid mobile banner', () => {
    expect(BannerItemSchema.safeParse(validItem).success).toBe(true);
  });

  it('accepts a valid desktop banner', () => {
    const result = BannerItemSchema.safeParse({
      ...validItem,
      type: 'desktop',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null linkUrl', () => {
    expect(
      BannerItemSchema.safeParse({ ...validItem, linkUrl: null }).success
    ).toBe(true);
  });

  it('accepts null order', () => {
    expect(
      BannerItemSchema.safeParse({ ...validItem, order: null }).success
    ).toBe(true);
  });

  it('rejects item missing type', () => {
    const { type: _type, ...withoutType } = validItem;
    expect(BannerItemSchema.safeParse(withoutType).success).toBe(false);
  });

  it('rejects unknown type value', () => {
    expect(
      BannerItemSchema.safeParse({ ...validItem, type: 'tablet' }).success
    ).toBe(false);
  });

  it('rejects missing title', () => {
    const { title: _title, ...withoutTitle } = validItem;
    expect(BannerItemSchema.safeParse(withoutTitle).success).toBe(false);
  });

  it('rejects invalid status', () => {
    expect(
      BannerItemSchema.safeParse({ ...validItem, status: 'archived' }).success
    ).toBe(false);
  });
});

describe('BannerManifestSchema', () => {
  it('accepts a manifest where all items are valid', () => {
    const result = BannerManifestSchema.safeParse({
      banners: [validItem, { ...validItem, id: 'b2', type: 'desktop' }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.banners).toHaveLength(2);
    }
  });

  it('rejects a manifest where any item is invalid', () => {
    // Per-item skipping is handled by the GCS adapter, not by this schema.
    // z.array() fails the whole parse if any element fails.
    const result = BannerManifestSchema.safeParse({
      banners: [
        validItem,
        { id: 'bad', imageUrl: 'not-a-url', status: 'published' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts an empty banners array', () => {
    const result = BannerManifestSchema.safeParse({ banners: [] });
    expect(result.success).toBe(true);
  });
});
