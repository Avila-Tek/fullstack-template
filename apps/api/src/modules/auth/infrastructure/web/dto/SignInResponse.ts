import { ApiProperty } from '@nestjs/swagger';

export class SignInResponse {
	@ApiProperty({
		description: 'JWT access token',
		example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
	})
	accessToken: string;

	@ApiProperty({
		description: 'User ID',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	userId: string;

	@ApiProperty({
		description: 'User email address',
		example: 'user@example.com',
	})
	email: string;
}
