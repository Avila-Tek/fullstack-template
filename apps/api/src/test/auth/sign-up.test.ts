import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignUpWithProviderUseCase } from '../../modules/auth/application/use-case/SignUpWithProviderUseCase';
import { AuthProviderFactoryPort } from '../../modules/auth/application/ports/out/AuthProviderFactoryPort';
import { AuthConfig } from '../../modules/auth/infrastructure/config/AuthConfig';
import { AuthProviderPort } from '../../modules/auth/application/ports/out/AuthProviderPort';

describe('SignUpWithProviderUseCase', () => {
  let providerFactory: Pick<AuthProviderFactoryPort, 'getProvider'>;
  let authConfig: Pick<AuthConfig, 'getProvider'>;
  let mockProvider: Record<keyof AuthProviderPort, ReturnType<typeof vi.fn>>;
  let useCase: SignUpWithProviderUseCase;

  beforeEach(() => {
    mockProvider = {
      signIn: vi.fn(),
      signUp: vi.fn(),
      getProviderType: vi.fn(),
    };

    providerFactory = { getProvider: vi.fn().mockReturnValue(mockProvider) };
    authConfig = { getProvider: vi.fn().mockReturnValue('Credentials') };

    useCase = new SignUpWithProviderUseCase(
      providerFactory as any,
      authConfig as any
    );
  });

  it('should call sign up on the provider', async () => {
    mockProvider.signUp.mockResolvedValue({
      accessToken: 'token123',
      userId: 'u1',
      email: 'a@b.com',
    });

    const result = await useCase.execute({
      email: 'a@b.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(authConfig.getProvider).toHaveBeenCalled();
    expect(providerFactory.getProvider).toHaveBeenCalledWith('Credentials');
    expect(mockProvider.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(result).toEqual({
      accessToken: 'token123',
      userId: 'u1',
      email: 'a@b.com',
    });
  });

  it('should throw an error if provider sign up fails due to existing user', async () => {
    mockProvider.signUp.mockRejectedValue(new Error('User already exists'));

    await expect(
      useCase.execute({
        email: 'a@b.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      })
    ).rejects.toThrow('User already exists');
  });
});
