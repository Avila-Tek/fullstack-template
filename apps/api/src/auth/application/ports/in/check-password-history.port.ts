export abstract class CheckPasswordHistoryPort {
  abstract execute(input: { userId: string; plainPassword: string }): Promise<void>;
}
