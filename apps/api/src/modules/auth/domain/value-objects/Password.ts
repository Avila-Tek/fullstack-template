export class Password {
  private constructor(private readonly value: string) {}

  static create(plainText: string): Password {
    // In a real implementation, you would hash the password here
    return new Password(plainText);
  }

  static restore(hashed: string): Password {
    return new Password(hashed);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: Password | string): boolean {
    if (other instanceof Password) {
      return this.value === other.getValue();
    }
    return this.value === other;
  }
}
