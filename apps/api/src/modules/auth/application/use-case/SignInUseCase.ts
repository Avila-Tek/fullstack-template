import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler, type QueryBus } from '@nestjs/cqrs';
import { type LoginCommand, SignInUseCasePort } from '../ports/in/SignInUseCasePort';
import type { TokenGenerator } from '../ports/out/TokenGenerator';
import type { PasswordHasher } from '../ports/out/PasswordHasher';
import { GetUserByEmailPort } from '../ports/out/GetUserByEmail';

@CommandHandler(SignInUseCasePort)
export class SignInUseCase implements ICommandHandler<SignInUseCasePort> {
	constructor(
		private readonly queryBus: QueryBus,
		private readonly passwordService: PasswordHasher,
		private readonly tokenGenerator: TokenGenerator,
	) {}

	async execute(command: LoginCommand) {
		const user = await this.queryBus.execute(
			new GetUserByEmailPort(command.email, command.password),
		);

		if (!user) {
			throw new UnauthorizedException('Invalid credentials');
		}

		if (!user.isActive()) {
			throw new UnauthorizedException('Account is disabled');
		}

		if (!user.password) {
			throw new UnauthorizedException('Invalid credentials');
		}

		const isPasswordValid = await this.passwordService.verify(
			command.password,
			user.password.getValue(),
		);

		if (!isPasswordValid) {
			throw new UnauthorizedException('Invalid credentials');
		}

		const accessToken = await this.tokenGenerator.generate({
			userId: user.id,
			email: user.email,
			roleId: user.roleId,
		});

		return {
			accessToken,
			userId: user.id,
			email: user.email,
		};
	}
}
