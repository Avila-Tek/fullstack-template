export abstract class TermsVersionServicePort {
	abstract resolveCurrentVersion(): Promise<string | null>;
}
