export class CountryId {
	private constructor(private readonly _value: string) {}

	static create(value: string): CountryId {
		if (!value || typeof value !== 'string') {
			throw new Error('CountryId must be a non-empty string');
		}
		return new CountryId(value);
	}

	get value(): string {
		return this._value;
	}

	equals(other: CountryId): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
