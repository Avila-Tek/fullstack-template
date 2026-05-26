import { normalizeEmail } from '@zoom/utils';
import { describe, expect, it } from 'vitest';

describe('normalizeEmail', () => {
  describe('base behavior', () => {
    it('lowercases the email address', () => {
      expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('leaves an already-normalized email unchanged', () => {
      expect(normalizeEmail('alice@example.com')).toBe('alice@example.com');
    });

    it('returns the input lowercased when there is no @ sign', () => {
      expect(normalizeEmail('notanemail')).toBe('notanemail');
    });

    it('returns an empty string without throwing', () => {
      expect(normalizeEmail('')).toBe('');
    });
  });

  describe('gmail.com', () => {
    it('removes dots from the local part', () => {
      expect(normalizeEmail('alice.bob@gmail.com')).toBe('alicebob@gmail.com');
    });

    it('strips the plus-suffix from the local part', () => {
      expect(normalizeEmail('alice+tag@gmail.com')).toBe('alice@gmail.com');
    });

    it('removes dots and plus-suffix together', () => {
      expect(normalizeEmail('alice.bob+tag@gmail.com')).toBe(
        'alicebob@gmail.com'
      );
    });
  });

  describe('googlemail.com', () => {
    it('removes dots from the local part and aliases domain to gmail.com', () => {
      expect(normalizeEmail('alice.bob@googlemail.com')).toBe(
        'alicebob@gmail.com'
      );
    });

    it('strips the plus-suffix and aliases domain to gmail.com', () => {
      expect(normalizeEmail('alice+tag@googlemail.com')).toBe(
        'alice@gmail.com'
      );
    });
  });

  describe('hotmail.com', () => {
    it('strips the plus-suffix from the local part', () => {
      expect(normalizeEmail('alice+tag@hotmail.com')).toBe('alice@hotmail.com');
    });

    it('preserves dots in the local part', () => {
      expect(normalizeEmail('alice.bob@hotmail.com')).toBe(
        'alice.bob@hotmail.com'
      );
    });
  });

  describe('live.com', () => {
    it('preserves dots in the local part', () => {
      expect(normalizeEmail('alice.bob@live.com')).toBe('alice.bob@live.com');
    });

    it('strips the plus-suffix from the local part', () => {
      expect(normalizeEmail('alice+tag@live.com')).toBe('alice@live.com');
    });
  });

  describe('outlook.com', () => {
    it('strips the plus-suffix from the local part', () => {
      expect(normalizeEmail('alice+tag@outlook.com')).toBe('alice@outlook.com');
    });

    it('preserves dots in the local part', () => {
      expect(normalizeEmail('alice.bob@outlook.com')).toBe(
        'alice.bob@outlook.com'
      );
    });
  });

  describe('unknown providers', () => {
    it('only lowercases, without touching dots or plus-suffixes', () => {
      expect(normalizeEmail('Alice.Bob+tag@Unknown.IO')).toBe(
        'alice.bob+tag@unknown.io'
      );
    });
  });
});
