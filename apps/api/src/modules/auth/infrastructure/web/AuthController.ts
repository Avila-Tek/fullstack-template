import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { authDTO, type TSignInInput, type TSignInResponse } from '@repo/schemas';
import { SignInUseCasePort } from '../../application/ports/in/SignInUseCasePort';
import { ZodApiBody, ZodApiResponse } from '../../../../shared/decorators/zodSwagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(CommandBus)
    private readonly commandBus: CommandBus
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
}
