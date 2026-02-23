export class InvalidEmailError extends Error {
  constructor(email: string) {
    super(`Invalid email format: ${email}`);
    this.name = 'InvalidEmailError';
  }
}

export class Email {
  private constructor(private readonly _value: string) {}

  static create(value: string): Email {
    if (!value || typeof value !== 'string') {
      throw new InvalidEmailError(value);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new InvalidEmailError(value);
    }

    return new Email(value.toLowerCase());
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
