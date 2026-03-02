import { Injectable, UnauthorizedException } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import {
  AuthProvider,
  type SignInData,
  type SignUpData,
} from '../../application/ports/out/AuthProvider';
import { ProviderType } from '../../domain/types/ProviderType';
import type { AuthResult } from '../../domain/types/AuthResult';
import { PasswordHasher } from '../../application/ports/out/PasswordHasher';
import { TokenGenerator } from '../../application/ports/out/TokenGenerator';
import { GetUserByEmailQuery } from '../../../shared/user/GetUserByEmail';
import { CreateUserCommand } from '../../../shared/user/CreateUser';
import { AuthUser } from '../../domain/entities/AuthUser';
import { UserStatusEnum } from '../../domain/value-objects/UserStatus';

@Injectable()
export class CredentialsAuthProvider extends AuthProvider {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenGenerator: TokenGenerator
  ) {
    super();
  }

  getProviderType(): ProviderType {
    return ProviderType.CREDENTIALS;
  }

  async signIn(data: SignInData): Promise<AuthResult> {
    const userDTO = await this.queryBus.execute(
      new GetUserByEmailQuery(data.email)
    );

    if (!userDTO) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = AuthUser.restore({
      id: userDTO.id,
      email: userDTO.email,
      passwordHash: userDTO.passwordHash,
      status: userDTO.status as UserStatusEnum,
    });

    if (!user.isActive()) {
      throw new UnauthorizedException('Account is disabled');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordHasher.verify(
      data.password,
      user.passwordHash.getValue()
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { userId: user.id, email: user.email };
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenGenerator.generate(payload),
      this.tokenGenerator.generateRefresh(),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: null,
        lastName: null,
        timezone: undefined,
        status: user.status.getValue(),
        createdAt: undefined,
        updatedAt: undefined,
      },
      accessToken,
      refreshToken,
    };
  }

  async signUp(data: SignUpData): Promise<AuthResult> {
    const hashedPassword = await this.passwordHasher.hash(data.password);

    const createdUser = await this.commandBus.execute(
      new CreateUserCommand(
        data.email,
        hashedPassword,
        data.firstName,
        data.lastName
      )
    );

    const payload = {
      userId: createdUser.id,
      email: createdUser.email,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenGenerator.generate(payload),
      this.tokenGenerator.generateRefresh(),
    ]);

    return {
      user: {
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName || null,
        lastName: createdUser.lastName || null,
        timezone: createdUser.timezone,
        status: createdUser.status as UserStatusEnum,
        createdAt: null,
        updatedAt: null,
      },
      accessToken,
      refreshToken,
    };
  }
}
