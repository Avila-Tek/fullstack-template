import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SignInWithProviderPort } from '../../application/ports/in/SignInWithProviderPort';
import { SignUpWithProviderPort } from '../../application/ports/in/SignUpWithProviderPort';
import {
	SignInWithProviderRequest,
	type TSignInWithProviderRequest,
} from './dto/SignInWithProviderRequest';
import {
	SignUpWithProviderRequest,
	type TSignUpWithProviderRequest,
} from './dto/SignUpWithProviderRequest';
import {
	authWithProviderResponseSchema,
	type TAuthWithProviderResponse,
} from './dto/AuthWithProviderResponse';
import { ZodApiBody, ZodApiResponse } from '@shared/decorators/zodSwagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
	constructor(
		private readonly signInUseCase: SignInWithProviderPort,
		private readonly signUpUseCase: SignUpWithProviderPort,
	) {}

	@Post('/sign-in')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'User sign in',
		description:
			'Authenticate a user with the configured authentication provider. Returns user data and authentication tokens.',
	})
	@ZodApiBody(SignInWithProviderRequest.schema)
	@ZodApiResponse(
		200,
		authWithProviderResponseSchema,
		'SignIn successful - returns user and tokens',
	)
	@ApiResponse({ status: 401, description: 'Invalid credentials' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	async signIn(
		@Body() dto: TSignInWithProviderRequest,
	): Promise<TAuthWithProviderResponse> {
		const result = await this.signInUseCase.execute(
			SignInWithProviderRequest.toDto(dto),
		);

		return {
			success: true,
			data: result,
		};
	}

	@Post('/sign-up')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({
		summary: 'User sign up',
		description:
			'Register a new user with the configured authentication provider. Returns user data and authentication tokens.',
	})
	@ZodApiBody(SignUpWithProviderRequest.schema)
	@ZodApiResponse(
		201,
		authWithProviderResponseSchema,
		'SignUp successful - returns user and tokens',
	)
	@ApiResponse({ status: 409, description: 'User already exists' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	async signUp(
		@Body() dto: TSignUpWithProviderRequest,
	): Promise<TAuthWithProviderResponse> {
		const result = await this.signUpUseCase.execute(
			SignUpWithProviderRequest.toDto(dto),
		);

		return {
			success: true,
			data: result,
		};
	}
}
