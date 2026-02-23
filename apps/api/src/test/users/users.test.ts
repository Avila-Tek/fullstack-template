// sign-in.usecase.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { QueryBus } from '@nestjs/cqrs';
import { SignInUseCase } from '../../modules/auth/application/use-case/SignInUseCase';

function mockUser(overrides: Partial<any> = {}) {
  return {
    id: 'u1',
    email: 'a@b.com',
    roleId: 'r1',
    password: { getValue: () => 'hashed' },
    isActive: () => true,
    ...overrides,
  };
}

describe('SignInUseCase', () => {
  let queryBus: Pick<QueryBus, 'execute'>;
  let passwordHasher: { verify: ReturnType<typeof vi.fn> };
  let tokenGenerator: { generate: ReturnType<typeof vi.fn> };

  let useCase: SignInUseCase;

  beforeEach(() => {
    queryBus = { execute: vi.fn() };
    passwordHasher = { verify: vi.fn() };
    tokenGenerator = { generate: vi.fn() };

    useCase = new SignInUseCase(
      queryBus as any,
      passwordHasher as any,
      tokenGenerator as any
    );
  });

  it('Sign In: Invalid email', async () => {
    (queryBus.execute as any).mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'pw' })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(passwordHasher.verify).not.toHaveBeenCalled();
    expect(tokenGenerator.generate).not.toHaveBeenCalled();
  });

  it('Sign In: Disabled user', async () => {
    (queryBus.execute as any).mockResolvedValue(
      mockUser({ isActive: () => false })
    );

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'pw' })
    ).rejects.toMatchObject({ message: 'Account is disabled' });

    expect(passwordHasher.verify).not.toHaveBeenCalled();
  });

  it('Sign In: Invalid password', async () => {
    (queryBus.execute as any).mockResolvedValue(mockUser());
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'pw' })
    ).rejects.toMatchObject({ message: 'Invalid credentials' });

    expect(passwordHasher.verify).toHaveBeenCalledWith('pw', 'hashed');
    expect(tokenGenerator.generate).not.toHaveBeenCalled();
  });

  it('Sign In: Success', async () => {
    const user = mockUser();
    (queryBus.execute as any).mockResolvedValue(user);
    passwordHasher.verify.mockResolvedValue(true);
    tokenGenerator.generate.mockResolvedValue('token123');

    const result = await useCase.execute({
      email: user.email,
      password: 'pw',
    });

    expect(result).toEqual({
      accessToken: 'token123',
      userId: user.id,
      email: user.email,
    });

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(passwordHasher.verify).toHaveBeenCalledWith('pw', 'hashed');
    expect(tokenGenerator.generate).toHaveBeenCalledWith({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
    });
  });
});
