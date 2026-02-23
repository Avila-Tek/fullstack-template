export enum UserStatusEnum {
	ACTIVE = 'active',
	DISABLED = 'disabled',
}

export class Status {
	private constructor(private readonly value: UserStatusEnum) {}

	static active(): Status {
		return new Status(UserStatusEnum.ACTIVE);
	}

	static disabled(): Status {
		return new Status(UserStatusEnum.DISABLED);
	}

	static restore(value: UserStatusEnum): Status {
		if (value === UserStatusEnum.ACTIVE) return Status.active();
		if (value === UserStatusEnum.DISABLED) return Status.disabled();
		throw new Error('Invalid status value');
	}

	public getValue(): UserStatusEnum {
		return this.value;
	}

	public equals(other: Status | UserStatusEnum): boolean {
		if (other instanceof Status) {
			return this.value === other.getValue();
		}
		return this.value === other;
	}
}
