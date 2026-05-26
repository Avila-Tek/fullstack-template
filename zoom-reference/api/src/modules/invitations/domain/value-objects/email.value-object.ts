import { normalizeEmail } from '@zoom/utils';

/** Value object wrapping a canonically normalized email address. */
export class Email {
	private constructor(readonly value: string) {}

	static fromRaw(raw: string): Email {
		return new Email(normalizeEmail(raw));
	}

	equals(other: Email): boolean {
		return this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}
