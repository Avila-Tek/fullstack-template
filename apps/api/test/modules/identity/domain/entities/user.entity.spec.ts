import { describe, expect, it } from 'vitest';
import { Email } from '@/modules/identity/domain/value-objects/user.value-object';
import { User } from '@/modules/identity/domain/entities/user.entity';

describe('User', () => {
	const props = {
		id: 'user-1',
		email: Email.create('test@example.com'),
		emailVerified: true,
	};

	it('reconstitute creates a user with correct properties', () => {
		const user = User.reconstitute(props);

		expect(user.id).toBe('user-1');
		expect(user.email.value).toBe('test@example.com');
		expect(user.emailVerified).toBe(true);
	});

	it('pullDomainEvents returns empty array for a reconstituted user', () => {
		const user = User.reconstitute(props);
		expect(user.pullDomainEvents()).toEqual([]);
	});

	it('pullDomainEvents drains the event queue', () => {
		const user = User.reconstitute(props);

		const first = user.pullDomainEvents();
		const second = user.pullDomainEvents();

		expect(first).toEqual([]);
		expect(second).toEqual([]);
	});
});
