import type { ErrorEvent, EventHint } from '@sentry/nestjs';
import * as Sentry from '@sentry/nestjs';

export interface SentryOptions {
	dsn: string | undefined;
	enabled: boolean;
	environment: string | undefined;
	release: string | undefined;
	tracesSampleRate: number;
	beforeSend: (event: ErrorEvent, hint: EventHint) => ErrorEvent | null;
}

export function createSentryOptions(): SentryOptions {
	return {
		dsn: process.env.SENTRY_DSN,
		// Sentry is enabled whenever a DSN is set. Deployments (dev, staging,
		// production) inject SENTRY_DSN via GCP Secret Manager; local laptops
		// leave it unset and Sentry stays dark. Decoupling from NODE_ENV lets
		// us validate the integration on dev before pointing prod at it.
		enabled: !!process.env.SENTRY_DSN,
		environment: process.env.NODE_ENV,
		release: process.env.GIT_SHA,
		tracesSampleRate: 0.1,
		beforeSend(event, hint) {
			const err = hint?.originalException as {
				status?: number;
				response?: { status?: number };
			} | null;
			const status = err?.status ?? err?.response?.status;
			if (typeof status === 'number' && status < 500) {
				return null;
			}
			return event;
		},
	};
}

Sentry.init(createSentryOptions());
