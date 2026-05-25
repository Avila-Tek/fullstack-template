/**
 * Inspects the Better Auth hook `ctx.context.returned` shape and extracts the
 * HTTP status code (if any) and error code (if any). BA surfaces handler errors
 * as either `{ statusCode, body: { code } }` for API calls or a Response-like
 * object with a `headers.get('location')` redirect URL carrying `?error=CODE`.
 */
export interface ReturnedStatus {
	isError: boolean;
	statusCode: number;
	errorCode: string | null;
}

export function parseReturnedStatus(returned: unknown): ReturnedStatus {
	if (
		returned === null ||
		returned === undefined ||
		typeof returned !== 'object'
	) {
		return { isError: false, statusCode: 0, errorCode: null };
	}
	const obj = returned as {
		statusCode?: unknown;
		body?: { code?: unknown } | unknown;
		headers?: { get?: (name: string) => string | null };
	};

	// Redirect-style BA error: Response with Location header carrying ?error=CODE
	if (typeof obj.headers?.get === 'function') {
		const location = obj.headers.get('location');
		if (location) {
			try {
				const errorParam = new URL(location).searchParams.get('error');
				if (errorParam) {
					return { isError: true, statusCode: 302, errorCode: errorParam };
				}
			} catch {
				// invalid URL — fall through to status-code branch
			}
		}
	}

	const statusCode = typeof obj.statusCode === 'number' ? obj.statusCode : 0;
	const bodyCode =
		obj.body && typeof obj.body === 'object'
			? (obj.body as { code?: unknown }).code
			: undefined;
	const errorCode = typeof bodyCode === 'string' ? bodyCode : null;
	return {
		isError: statusCode >= 400,
		statusCode,
		errorCode,
	};
}
