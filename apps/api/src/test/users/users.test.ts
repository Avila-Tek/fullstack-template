import { UnauthorizedException } from '@nestjs/common';
import type { CommandBus } from '@nestjs/cqrs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PasswordHasher } from '../../modules/auth/application/ports/out/PasswordHasher';
import type { TokenGenerator } from '../../modules/auth/application/ports/out/TokenGenerator';
import { SignInUseCase } from '../../modules/auth/application/use-case/SignInUseCase';
import { AuthUser } from '../../modules/auth/domain/entities/AuthUser';
import { UserStatusEnum } from '../../modules/auth/domain/value-objects/UserStatus';

interface AuthUserOverrides {
  passwordHash?: string | null;
  status?: UserStatusEnum;
}

function mockUser(overrides: AuthUserOverrides = {}): AuthUser {
  return AuthUser.restore({
    id: 'u1',
    email: 'a@b.com',
    passwordHash: 'hashed',
    status: UserStatusEnum.ACTIVE,
    ...overrides,
  });
}

describe('SignInUseCase', () => {
  const execute = vi.fn();
  const verify = vi.fn();
  const generate = vi.fn();
  const generateRefresh = vi.fn();

  let useCase: SignInUseCase;

  beforeEach(() => {
    vi.resetAllMocks();

    const commandBus = { execute } as unknown as CommandBus;
    const passwordHasher: PasswordHasher = { hash: vi.fn(), verify };
    const tokenGenerator: TokenGenerator = { generate, generateRefresh };

    useCase = new SignInUseCase(commandBus, passwordHasher, tokenGenerator);
  });

  it('Sign In: Invalid email', async () => {
    execute.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'pw' })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(verify).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it('Sign In: Disabled user', async () => {
    execute.mockResolvedValue(mockUser({ status: UserStatusEnum.INACTIVE }));

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'pw' })
    ).rejects.toMatchObject({ message: 'Account is disabled' });

    expect(verify).not.toHaveBeenCalled();
  });

  it('Sign In: Invalid password', async () => {
    execute.mockResolvedValue(mockUser());
    verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'pw' })
    ).rejects.toMatchObject({ message: 'Invalid credentials' });

    expect(verify).toHaveBeenCalledWith('pw', 'hashed');
    expect(generate).not.toHaveBeenCalled();
    expect(generateRefresh).not.toHaveBeenCalled();
  });

  it('Sign In: Success', async () => {
    const user = mockUser();
    execute.mockResolvedValue(user);
    verify.mockResolvedValue(true);
    generate.mockResolvedValue('token123');
    generateRefresh.mockResolvedValue('refresh123');

    const result = await useCase.execute({
      email: user.email,
      password: 'pw',
    });

    expect(result).toEqual({
      user: {
        id: user.id,
        email: user.email,
        firstName: null,
        lastName: null,
        timezone: undefined,
        status: UserStatusEnum.ACTIVE,
        createdAt: undefined,
        updatedAt: undefined,
      },
      accessToken: 'token123',
      refreshToken: 'refresh123',
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith('pw', 'hashed');
    expect(generate).toHaveBeenCalledWith({
      userId: user.id,
      email: user.email,
    });
    expect(generateRefresh).toHaveBeenCalledTimes(1);
  });
});
