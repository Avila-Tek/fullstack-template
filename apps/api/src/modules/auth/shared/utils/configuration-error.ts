/**
 * Thrown when a required runtime configuration is missing or invalid.
 * This is a fatal error that should be caught at startup, not during request handling.
 */
export class ConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ConfigurationError';
	}
}
