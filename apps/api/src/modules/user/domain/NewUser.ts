import type { Email } from './value-objects/Email';

export type UserStatus = 'active' | 'disabled';

export interface UserProps {
	email: Email;
	password: string | null;
	firstName: string | null;
	lastName: string | null;
	timezone: string;
	status: UserStatus;
	roleId: string | null;
}

export class NewUser {
	private constructor(private readonly props: UserProps) {}

	static create(props: UserProps): NewUser {
		return new NewUser(props);
	}

	static restore(props: UserProps): NewUser {
		return new NewUser(props);
	}

	get email(): Email {
		return this.props.email;
	}

	get firstName(): string | null {
		return this.props.firstName;
	}

	get lastName(): string | null {
		return this.props.lastName;
	}

	get timezone(): string {
		return this.props.timezone;
	}

	get status(): UserStatus {
		return this.props.status;
	}

	get roleId(): string | null {
		return this.props.roleId;
	}

	get password(): string | null {
		return this.props.password;
	}

	isActive(): boolean {
		return this.props.status === 'active';
	}
}
