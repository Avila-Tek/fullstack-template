import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createUserInput, type TUser, userSchema } from '@repo/schemas';
import { ZodApiBody, ZodApiResponse } from '../../../../shared/decorators/zodSwagger';
import { CreateUserPort } from '../../application/ports/in/CreateUserPort';
import { InvalidPasswordError } from '../../domain/policies/PasswordPolicy';
import { RegisterUserRequest } from './dto/RegisterUserRequest';
import { userFromDomain } from './dto/UserResponse';

@ApiTags('Users')
@Controller('users')
export class UserController {
	constructor(
		@Inject(CreateUserPort)
		private readonly registerUseCase: CreateUserPort
	) {}

	@Post('register')
	@ApiOperation({
		summary: 'Register a new user',
		description:
			'Creates a new user account with the provided information. Returns the created user details.',
	})
	@ZodApiBody(createUserInput)
	@ZodApiResponse(201, userSchema, 'User registered successfully')
	@ApiResponse({
		status: 409,
		description:
			'User already exists - an account with this email is already registered',
	})
	@ApiResponse({
		status: 400,
		description:
			'Bad request - invalid input data or password validation failed',
	})
	async register(@Body() dto: RegisterUserRequest): Promise<TUser> {
		try {
			const user = await this.registerUseCase.execute(
				RegisterUserRequest.toDto(dto),
			);
			return userFromDomain(user);
		} catch (error) {
			if (error instanceof InvalidPasswordError) {
				throw new BadRequestException({
					message: 'Password validation failed',
					errors: error.errors,
				});
			}
			throw error;
		}
	}
}
