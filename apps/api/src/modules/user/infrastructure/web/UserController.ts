import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { CreateUserPort } from '../../application/ports/in/CreateUserPort';
import { InvalidPasswordError } from '../../domain/policies/PasswordPolicy';
import { RegisterUserRequest } from './dto/RegisterUserRequest';
import { UserResponse } from './dto/UserResponse';

@ApiTags('Users')
@Controller('users')
export class UserController {
	constructor(private readonly registerUseCase: CreateUserPort) {}

	@Post('register')
	@ApiOperation({
		summary: 'Register a new user',
		description:
			'Creates a new user account with the provided information. Returns the created user details.',
	})
	@ApiBody({ type: RegisterUserRequest })
	@ApiResponse({
		status: 201,
		description: 'User registered successfully',
		type: UserResponse,
	})
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
	async register(@Body() dto: RegisterUserRequest): Promise<UserResponse> {
		try {
			const user = await this.registerUseCase.execute(
				RegisterUserRequest.toDto(dto),
			);
			return UserResponse.fromDomain(user);
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
