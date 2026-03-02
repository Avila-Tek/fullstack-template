import type { ProviderType } from '../../../domain/types/ProviderType';
import type { AuthProviderPort } from './AuthProviderPort';

export abstract class AuthProviderFactoryPort {
  abstract getProvider(providerType: ProviderType): AuthProviderPort;
}
