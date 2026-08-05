import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import {
  authDTO,
  type TSignInInput,
  type TSignInResponse,
  type TSignUpInput,
  type TSignUpResponse,
} from '@repo/schemas';
import { SignInUseCasePort } from '../../application/ports/in/SignInUseCasePort';
import { PasswordHasher } from '../../application/ports/out/PasswordHasher';
import { ZodApiBody, ZodApiResponse } from '../../../../shared/decorators/zodSwagger';
import { CreateUserPort } from '../../../user/application/ports/in/CreateUserPort';
import { userFromDomain } from '../../../user/infrastructure/web/dto/UserResponse';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly createUser: CreateUserPort,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  @Post('/sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User sign in' })
  @ZodApiBody(authDTO.signInInput)
  @ZodApiResponse(200, authDTO.signInResponse, 'SignIn successful')
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(@Body() dto: TSignInInput): Promise<TSignInResponse> {
    const result = await this.commandBus.execute(
      new SignInUseCasePort(dto.email, dto.password),
    );

    return {
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };
  }

  @Post('/sign-up')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User sign up' })
  @ZodApiBody(authDTO.signUpInput)
  @ZodApiResponse(201, authDTO.signUpResponse, 'SignUp successful')
  @ApiResponse({ status: 400, description: 'Invalid input or passwords mismatch' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async signUp(@Body() dto: TSignUpInput): Promise<TSignUpResponse> {
    if (dto.password !== dto.rePassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = await this.createUser.execute({
      email: dto.email,
      password: passwordHash,
      firstName: dto.firstName ?? '',
      lastName: dto.lastName ?? '',
    });

    return {
      success: true,
      data: {
        user: userFromDomain(user),
        // El template aún no tiene flujo de verificación de correo
        requiresEmailConfirmation: false,
      },
    };
  }
}
