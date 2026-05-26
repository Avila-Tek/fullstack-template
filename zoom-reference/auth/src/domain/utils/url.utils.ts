/** Returns true only for http:// or https:// URLs. */
export function isValidUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

/** Returns true when the value is not a valid http/https URL. */
export function isInvalidUrl(value: string): boolean {
	return !isValidUrl(value);
}
