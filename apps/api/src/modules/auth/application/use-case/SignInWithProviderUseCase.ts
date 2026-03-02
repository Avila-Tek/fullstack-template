import { Injectable } from '@nestjs/common';
import {
  SignInWithProviderPort,
  type SignInWithProviderDto,
} from '../ports/in/SignInWithProviderPort';
import type { AuthResult } from '../../domain/types/AuthResult';
import { AuthProviderFactoryPort } from '../ports/out/AuthProviderFactoryPort';
import { AuthConfigPort } from '../ports/out/AuthConfigPort';

@Injectable()
export class SignInWithProviderUseCase implements SignInWithProviderPort {
  constructor(
    private readonly providerFactory: AuthProviderFactoryPort,
    private readonly authConfig: AuthConfigPort
  ) {}

  async execute(dto: SignInWithProviderDto): Promise<AuthResult> {
    const providerType = this.authConfig.getProvider();
    const provider = this.providerFactory.getProvider(providerType);
    return provider.signIn({
      email: dto.email,
      password: dto.password,
    });
  }
}
