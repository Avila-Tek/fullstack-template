import { Injectable } from '@nestjs/common';
import {
  SignUpWithProviderPort,
  type SignUpWithProviderDto,
} from '../ports/in/SignUpWithProviderPort';
import type { AuthResult } from '../../domain/types/AuthResult';
import { AuthProviderFactoryPort } from '../ports/out/AuthProviderFactoryPort';
import { AuthConfigPort } from '../ports/out/AuthConfigPort';

@Injectable()
export class SignUpWithProviderUseCase implements SignUpWithProviderPort {
  constructor(
    private readonly providerFactory: AuthProviderFactoryPort,
    private readonly authConfig: AuthConfigPort
  ) {}

  async execute(dto: SignUpWithProviderDto): Promise<AuthResult> {
    const providerType = this.authConfig.getProvider();
    const provider = this.providerFactory.getProvider(providerType);
    return provider.signUp({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
  }
}
