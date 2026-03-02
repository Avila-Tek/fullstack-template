import { Injectable, BadRequestException } from '@nestjs/common';
import { ProviderType } from '../../domain/types/ProviderType';
import { AuthProviderPort } from '../../application/ports/out/AuthProviderPort';
import { AuthProviderFactoryPort } from '../../application/ports/out/AuthProviderFactoryPort';
import { CredentialsAuthProvider } from './CredentialsAuthProvider';

@Injectable()
export class AuthProviderFactoryImpl extends AuthProviderFactoryPort {
  constructor(private readonly credentialsProvider: CredentialsAuthProvider) {
    super();
  }

  getProvider(providerType: ProviderType): AuthProviderPort {
    switch (providerType) {
      case ProviderType.CREDENTIALS:
        return this.credentialsProvider;
      case ProviderType.GOOGLE:
      case ProviderType.GITHUB:
        throw new BadRequestException(
          `Provider ${providerType} is not yet implemented`
        );
      default:
        throw new BadRequestException(`Unknown provider: ${providerType}`);
    }
  }
}
