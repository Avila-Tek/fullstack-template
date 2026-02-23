import type { TUser } from '@repo/schemas';
import type { User } from '../../../domain/User';

export function userFromDomain(user: User): TUser {
	const status: TUser['status'] = user.status.getValue();

	return {
		id: user.id.value,
		email: user.email.value,
		firstName: user.firstName,
		lastName: user.lastName,
		status,
		createdAt: undefined,
		updatedAt: undefined,
	};
}
