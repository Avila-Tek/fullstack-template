// Domain value objects — zero framework dependencies.
import { emailSchema } from '@repo/schemas';
import { InvalidEmailException } from '../exceptions/invalid-email.exception';

export class Email {
	readonly value: string;

	private constructor(value: string) {
		this.value = value;
	}

	static create(raw: string): Email {
		const normalized = raw.trim().toLowerCase();
		const result = emailSchema.safeParse(normalized);
		if (!result.success) {
			throw new InvalidEmailException();
		}
		return new Email(normalized);
	}

	equals(other: Email): boolean {
		return this.value === other.value;
	}
}
