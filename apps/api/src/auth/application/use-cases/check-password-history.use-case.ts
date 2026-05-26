import { Injectable } from '@nestjs/common';
import { CheckPasswordHistoryPort } from '../ports/in/check-password-history.port.js';
import { PasswordHistoryRepositoryPort } from '../ports/out/password-history.repository.port.js';
import { PasswordHasherPort } from '../ports/out/password-hasher.port.js';
import { PasswordReuseException } from '../../domain/exceptions/password-reuse.exception.js';
import { env } from '../../../env.js';

@Injectable()
export class CheckPasswordHistoryUseCase extends CheckPasswordHistoryPort {
  constructor(
    private readonly repo: PasswordHistoryRepositoryPort,
    private readonly hasher: PasswordHasherPort,
  ) {
    super();
  }

  async execute(input: { userId: string; plainPassword: string }): Promise<void> {
    const history = await this.repo.findLastN(input.userId, env.PASSWORD_HISTORY_DEPTH);

    for (const entry of history) {
      const matches = await this.hasher.verify(entry.hashedPassword, input.plainPassword);
      if (matches) {
        throw new PasswordReuseException();
      }
    }
  }
}
