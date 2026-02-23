export class UserId {
  private constructor(private readonly _value: string) {}

  static create(value: string): UserId {
    if (!value || typeof value !== 'string') {
      throw new Error('UserId must be a non-empty string');
    }
    return new UserId(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: UserId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
