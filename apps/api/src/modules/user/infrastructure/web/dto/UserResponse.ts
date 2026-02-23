import { ApiProperty } from '@nestjs/swagger';
import type { UserStatus } from '../../../domain/User';
import type { User } from '../../../domain/User';

export class UserResponse {
	@ApiProperty({
		description: 'Unique identifier of the user',
		example: '550e8400-e29b-41d4-a716-446655440000',
	})
	id: string;

	@ApiProperty({
		description: 'Email address of the user',
		example: 'user@example.com',
	})
	email: string;

	@ApiProperty({
		description: 'First name of the user',
		example: 'John',
		nullable: true,
	})
	firstName: string | null;

	@ApiProperty({
		description: 'Last name of the user',
		example: 'Doe',
		nullable: true,
	})
	lastName: string | null;

	@ApiProperty({
		description: 'Timezone of the user',
		example: 'America/New_York',
	})
	timezone: string;

	@ApiProperty({
		description: 'Current status of the user account',
		enum: ['Active', 'Disabled'],
		example: 'Active',
	})
	status: UserStatus;

	static fromDomain(user: User): UserResponse {
		const dto = new UserResponse();
		dto.id = user.id.value;
		dto.email = user.email.value;
		dto.firstName = user.firstName;
		dto.lastName = user.lastName;
		dto.timezone = user.timezone;
		dto.status = user.status;
		return dto;
	}
}
