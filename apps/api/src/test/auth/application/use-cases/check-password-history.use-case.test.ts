import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckPasswordHistoryUseCase } from '@/auth/application/use-cases/check-password-history.use-case.js';
import { PasswordReuseException } from '@/auth/domain/exceptions/password-reuse.exception.js';
import type { PasswordHistoryRepositoryPort } from '@/auth/application/ports/out/password-history.repository.port.js';

describe('CheckPasswordHistoryUseCase', () => {
  let useCase: CheckPasswordHistoryUseCase;
  let repo: PasswordHistoryRepositoryPort;
  let argon2: { hash: (p: string) => Promise<string>; verify: (h: string, p: string) => Promise<boolean> };

  beforeEach(() => {
    repo = {
      findLastN: vi.fn(),
    } as unknown as PasswordHistoryRepositoryPort;
    argon2 = {
      hash: vi.fn(),
      verify: vi.fn(),
    };
    useCase = new CheckPasswordHistoryUseCase(repo, argon2);
  });

  it('does not throw when password is not in history', async () => {
    vi.mocked(repo.findLastN).mockResolvedValue([
      { id: '1', userId: 'u1', hashedPassword: '$hash1', createdAt: new Date() },
    ]);
    vi.mocked(argon2.verify).mockResolvedValue(false);

    await expect(
      useCase.execute({ userId: 'u1', plainPassword: 'NewPass1!' }),
    ).resolves.not.toThrow();
  });

  it('throws PasswordReuseException when password matches history', async () => {
    vi.mocked(repo.findLastN).mockResolvedValue([
      { id: '1', userId: 'u1', hashedPassword: '$hash1', createdAt: new Date() },
    ]);
    vi.mocked(argon2.verify).mockResolvedValue(true);

    await expect(
      useCase.execute({ userId: 'u1', plainPassword: 'OldPass1!' }),
    ).rejects.toThrow(PasswordReuseException);
  });

  it('checks all history entries before deciding', async () => {
    vi.mocked(repo.findLastN).mockResolvedValue([
      { id: '1', userId: 'u1', hashedPassword: '$hash1', createdAt: new Date() },
      { id: '2', userId: 'u1', hashedPassword: '$hash2', createdAt: new Date() },
    ]);
    vi.mocked(argon2.verify)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(
      useCase.execute({ userId: 'u1', plainPassword: 'OldPass1!' }),
    ).rejects.toThrow(PasswordReuseException);
    expect(argon2.verify).toHaveBeenCalledTimes(2);
  });

  it('passes empty history without throwing', async () => {
    vi.mocked(repo.findLastN).mockResolvedValue([]);

    await expect(
      useCase.execute({ userId: 'u1', plainPassword: 'AnyPass1!' }),
    ).resolves.not.toThrow();
  });
});
