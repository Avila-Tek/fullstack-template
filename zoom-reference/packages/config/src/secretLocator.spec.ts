import { describe, expect, it } from 'vitest';
import { isLocator, parseLocator } from './secretLocator';

describe('isLocator', () => {
  it('returns false for a plain value', () => {
    expect(isLocator('plain-string')).toBe(false);
  });

  it('returns false for a non-string input', () => {
    expect(isLocator(undefined)).toBe(false);
    expect(isLocator(null)).toBe(false);
    expect(isLocator(42)).toBe(false);
    expect(isLocator({})).toBe(false);
  });

  it('accepts a bare project/secret locator (no version suffix)', () => {
    expect(isLocator('projects/zoom-prod/secrets/MY_KEY')).toBe(true);
  });

  it('accepts the /versions/latest form', () => {
    expect(isLocator('projects/zoom-prod/secrets/MY_KEY/versions/latest')).toBe(
      true
    );
  });

  it('accepts a pinned numeric version', () => {
    expect(isLocator('projects/zoom-prod/secrets/MY_KEY/versions/3')).toBe(
      true
    );
  });

  it('rejects a non-numeric, non-latest version', () => {
    expect(isLocator('projects/zoom-prod/secrets/MY_KEY/versions/abc')).toBe(
      false
    );
  });

  it('rejects a project id with uppercase letters', () => {
    expect(isLocator('projects/BAD-UPPER/secrets/K')).toBe(false);
  });

  it('rejects a project id that is too short', () => {
    expect(isLocator('projects/abc/secrets/K')).toBe(false);
  });

  it('rejects a locator with an empty secret name', () => {
    expect(isLocator('projects/zoom-prod/secrets/')).toBe(false);
  });

  it('rejects a locator with trailing junk', () => {
    expect(
      isLocator('projects/zoom-prod/secrets/MY_KEY/versions/3/extra')
    ).toBe(false);
  });
});

describe('parseLocator', () => {
  it('returns null for a non-locator string', () => {
    expect(parseLocator('not a locator')).toBeNull();
  });

  it('parses a bare locator and defaults version to "latest"', () => {
    expect(parseLocator('projects/zoom-prod/secrets/MY_KEY')).toEqual({
      project: 'zoom-prod',
      name: 'MY_KEY',
      version: 'latest',
    });
  });

  it('parses a pinned numeric version', () => {
    expect(
      parseLocator('projects/zoom-prod/secrets/MY_KEY/versions/3')
    ).toEqual({
      project: 'zoom-prod',
      name: 'MY_KEY',
      version: '3',
    });
  });

  it('parses a /versions/latest form', () => {
    expect(
      parseLocator('projects/zoom-prod/secrets/MY_KEY/versions/latest')
    ).toEqual({
      project: 'zoom-prod',
      name: 'MY_KEY',
      version: 'latest',
    });
  });

  it('allows hyphens, underscores, digits in the secret name', () => {
    expect(
      parseLocator('projects/zoom-prod-123/secrets/my-Secret_1/versions/42')
    ).toEqual({
      project: 'zoom-prod-123',
      name: 'my-Secret_1',
      version: '42',
    });
  });
});
