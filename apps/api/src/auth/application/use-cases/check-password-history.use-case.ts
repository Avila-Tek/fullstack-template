import { Injectable } from '@nestjs/common';
import { CheckPasswordHistoryPort } from '@/auth/application/ports/in/check-password-history.port.js';
import { PasswordHistoryRepositoryPort } from '@/auth/application/ports/out/password-history.repository.port.js';
import { PasswordReuseException } from '@/auth/domain/exceptions/password-reuse.exception.js';
import { env } from '@/env.js';

interface HashAdapter {
  verify(hash: string, plain: string): Promise<boolean>;
}

@Injectable()
export class CheckPasswordHistoryUseCase extends CheckPasswordHistoryPort {
  constructor(
    private readonly repo: PasswordHistoryRepositoryPort,
    private readonly argon2: HashAdapter,
  ) {
    super();
  }

  async execute(input: { userId: string; plainPassword: string }): Promise<void> {
    const history = await this.repo.findLastN(input.userId, env.PASSWORD_HISTORY_DEPTH);

    for (const entry of history) {
      const matches = await this.argon2.verify(entry.hashedPassword, input.plainPassword);
      if (matches) {
        throw new PasswordReuseException();
      }
    }
  }
}
