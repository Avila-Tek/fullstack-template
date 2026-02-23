import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { CommandBus } from '@nestjs/cqrs';
import { SignInUseCasePort } from '../../application/ports/in/SignInUseCasePort';
import type { SignInRequest } from './dto/SignInRequest';
import { SignInResponse } from './dto/SignInResponse';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('/sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User sign in' })
  @ApiResponse({
    status: 200,
    description: 'SignIn successful',
    type: SignInResponse,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(@Body() dto: SignInRequest): Promise<SignInResponse> {
    const result = await this.commandBus.execute(
      new SignInUseCasePort(dto.email, dto.password),
    );

    return {
      accessToken: result.accessToken,
      userId: result.userId,
      email: result.email,
    };
  }
}
