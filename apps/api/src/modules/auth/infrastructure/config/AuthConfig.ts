import { Injectable } from '@nestjs/common';
import { ProviderType } from '../../domain/types/ProviderType';
import { AuthConfigPort } from '../../application/ports/out/AuthConfigPort';

@Injectable()
export class AuthConfig implements AuthConfigPort {
  private readonly provider: ProviderType;

  constructor() {
    const configuredProvider = process.env.AUTH_PROVIDER || 'credentials';

    if (!configuredProvider) {
      throw new Error('AUTH_PROVIDER environment variable is required');
    }

    if (
      !Object.values(ProviderType).includes(configuredProvider as ProviderType)
    ) {
      throw new Error(
        `Invalid AUTH_PROVIDER: ${configuredProvider}. Must be one of: ${Object.values(ProviderType).join(', ')}`
      );
    }

    this.provider = configuredProvider as ProviderType;
  }

  getProvider(): ProviderType {
    return this.provider;
  }
}
