import { describe, it, expect } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { domainToHttpStatus } from '../../../infrastructure/mapping/domain-to-http.mapper.js';
import { domainErrorMessage } from '../../../infrastructure/i18n/domain-messages.js';

describe('domainToHttpStatus', () => {
  it('returns 422 for unknown domain errors', () => {
    expect(domainToHttpStatus('UNKNOWN_ERROR')).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });
});

describe('domainErrorMessage', () => {
  it('returns the error code itself when no translation exists', () => {
    expect(domainErrorMessage('UNKNOWN_ERROR')).toBe('UNKNOWN_ERROR');
  });
});
