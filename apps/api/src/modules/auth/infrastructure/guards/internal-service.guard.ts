import { timingSafeEqual } from 'node:crypto';
import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
} from '@nestjs/common';
import { env } from '../../env';
import { ConfigurationError } from '../../shared/utils/configuration-error';

@Injectable()
export class InternalServiceGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const expected = env.AUTH_SERVICE_SECRET;
		if (!expected)
			throw new ConfigurationError('AUTH_SERVICE_SECRET not configured');

		const request = context
			.switchToHttp()
			.getRequest<{ headers: Record<string, string | undefined> }>();
		const provided = request.headers['x-service-secret'];

		if (!provided) return false;

		const expectedBuf = Buffer.from(expected);
		const providedBuf = Buffer.from(provided);

		// Do not return early when lengths differ — that leaks the secret's
		// length through timing. Always perform a constant-time comparison:
		// when the lengths match compare directly; otherwise compare the user
		// input against itself (always true) and negate.
		const lengthsMatch = providedBuf.byteLength === expectedBuf.byteLength;
		const isEqual = lengthsMatch
			? timingSafeEqual(providedBuf, expectedBuf)
			: !timingSafeEqual(providedBuf, providedBuf);

		return isEqual;
	}
}
