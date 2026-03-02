import { Injectable, BadRequestException } from '@nestjs/common';
import { ProviderType } from '../../domain/types/ProviderType';
import type { AuthProvider } from '../../application/ports/out/AuthProvider';
import { AuthProviderFactory } from '../../application/ports/out/AuthProviderFactory';
import { CredentialsAuthProvider } from './CredentialsAuthProvider';

@Injectable()
export class AuthProviderFactoryImpl extends AuthProviderFactory {
	constructor(
		private readonly credentialsProvider: CredentialsAuthProvider,
	) {
		super();
	}

	getProvider(providerType: ProviderType): AuthProvider {
		switch (providerType) {
			case ProviderType.CREDENTIALS:
				return this.credentialsProvider;
			case ProviderType.GOOGLE:
			case ProviderType.GITHUB:
				throw new BadRequestException(
					`Provider ${providerType} is not yet implemented`,
				);
			default:
				throw new BadRequestException(`Unknown provider: ${providerType}`);
		}
	}
}
