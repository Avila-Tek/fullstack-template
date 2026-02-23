import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { LoginCommand, SignInUseCasePort } from '../ports/in/SignInUseCasePort';
import { GetUserByEmailPort } from '../ports/out/GetUserByEmail';
import { PasswordHasher } from '../ports/out/PasswordHasher';
import { TokenGenerator } from '../ports/out/TokenGenerator';

@CommandHandler(SignInUseCasePort)
export class SignInUseCase implements ICommandHandler<SignInUseCasePort> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly passwordService: PasswordHasher,
    private readonly tokenGenerator: TokenGenerator
  ) {}

  async execute(command: LoginCommand) {
    const user = await this.queryBus.execute(
      new GetUserByEmailPort(command.email, command.password)
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive()) {
      throw new UnauthorizedException('Account is disabled');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(
      command.password,
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
}
