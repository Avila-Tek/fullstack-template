import { ApiProperty } from '@nestjs/swagger';

export class SignInRequest {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
  })
  password: string;
}
