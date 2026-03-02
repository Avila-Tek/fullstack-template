import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignInWithProviderUseCase } from '../../modules/auth/application/use-case/SignInWithProviderUseCase';
import { AuthProviderFactoryPort } from '../../modules/auth/application/ports/out/AuthProviderFactoryPort';
import { AuthConfig } from '../../modules/auth/infrastructure/config/AuthConfig';
import { AuthProviderPort } from '../../modules/auth/application/ports/out/AuthProviderPort';

describe('SignInWithProviderUseCase', () => {
  let providerFactory: Pick<AuthProviderFactoryPort, 'getProvider'>;
  let authConfig: Pick<AuthConfig, 'getProvider'>;
  let mockProvider: Record<keyof AuthProviderPort, ReturnType<typeof vi.fn>>;
  let useCase: SignInWithProviderUseCase;

  beforeEach(() => {
    mockProvider = {
      signIn: vi.fn(),
      signUp: vi.fn(),
      getProviderType: vi.fn(),
    };

    providerFactory = { getProvider: vi.fn().mockReturnValue(mockProvider) };
    authConfig = { getProvider: vi.fn().mockReturnValue('Credentials') };

    useCase = new SignInWithProviderUseCase(
      providerFactory as any,
      authConfig as any
    );
  });

  it('should call sign in on the provider', async () => {
    mockProvider.signIn.mockResolvedValue({
      accessToken: 'token123',
      userId: 'u1',
      email: 'a@b.com',
    });

    const result = await useCase.execute({
      email: 'a@b.com',
      password: 'password123',
    });

    expect(authConfig.getProvider).toHaveBeenCalled();
    expect(providerFactory.getProvider).toHaveBeenCalledWith('Credentials');
    expect(mockProvider.signIn).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'password123',
    });
    expect(result).toEqual({
      accessToken: 'token123',
      userId: 'u1',
      email: 'a@b.com',
    });
  });

  it('should throw an error if provider sign in fails', async () => {
    mockProvider.signIn.mockRejectedValue(new Error('Invalid credentials'));

    await expect(
      useCase.execute({
        email: 'a@b.com',
        password: 'wrong_password',
      })
    ).rejects.toThrow('Invalid credentials');
  });
});
