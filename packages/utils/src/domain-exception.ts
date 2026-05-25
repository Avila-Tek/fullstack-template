export class DomainException extends Error {
  constructor(
    readonly error: string,
    readonly meta?: Record<string, unknown>
  ) {
    super(error);
    this.name = this.constructor.name;
  }
}
