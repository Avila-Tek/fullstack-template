import type { ProviderType } from '../../../domain/types/ProviderType';

export abstract class AuthConfigPort {
  abstract getProvider(): ProviderType;
}
