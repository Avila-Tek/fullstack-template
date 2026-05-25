import { describe, it, expect } from 'vitest';
import { DomainException } from '../../shared/domain-exception';

describe('DomainException', () => {
  it('stores the error code', () => {
    const ex = new DomainException('AUTH_INVALID_CREDENTIALS');
    expect(ex.error).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('is an instance of Error', () => {
    const ex = new DomainException('AUTH_INVALID_CREDENTIALS');
    expect(ex).toBeInstanceOf(Error);
  });

  it('sets the name to the class name', () => {
    const ex = new DomainException('AUTH_INVALID_CREDENTIALS');
    expect(ex.name).toBe('DomainException');
  });

  it('stores optional meta', () => {
    const ex = new DomainException('AUTH_INVALID_CREDENTIALS', { attempt: 3 });
    expect(ex.meta).toEqual({ attempt: 3 });
  });

  it('meta is undefined when not provided', () => {
    const ex = new DomainException('AUTH_INVALID_CREDENTIALS');
    expect(ex.meta).toBeUndefined();
  });
});
