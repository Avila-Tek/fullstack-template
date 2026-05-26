import type { DomainEvent } from '../events/domain-event';
import { Email } from '../value-objects/user.value-object';

export interface UserProps {
	id: string;
	email: Email;
	emailVerified: boolean;
}

// User is the aggregate root for the auth bounded context.
// All state mutations go through its methods; side-effects are captured as
// domain events retrieved via pullDomainEvents().
export class User {
	readonly id: string;
	readonly emailVerified: boolean;

	private _email: Email;
	private readonly _events: DomainEvent[] = [];

	private constructor(props: UserProps) {
		this.id = props.id;
		this._email = props.email;
		this.emailVerified = props.emailVerified;
	}

	/** Reconstitute an existing user from persistence (no events emitted). */
	static reconstitute(props: UserProps): User {
		return new User(props);
	}

	get email(): Email {
		return this._email;
	}

	/** Returns accumulated domain events and clears the internal queue. */
	pullDomainEvents(): DomainEvent[] {
		const events = [...this._events];
		this._events.length = 0;
		return events;
	}
}
