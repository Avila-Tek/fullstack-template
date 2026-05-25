import {
	type CallHandler,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Observable } from 'rxjs';

/**
 * Attaches the Better Auth session user to the active Sentry isolation scope.
 *
 * Runs after Better Auth's global AuthGuard (which populates `request.session`
 * and `request.user`) and before the controller handler. The isolation scope
 * is already open here — sentryScopeMiddleware sets it before any guard or
 * interceptor runs.
 *
 * No-op when the route is anonymous (no session) — keeps the interceptor safe
 * to apply globally without breaking @AllowAnonymous() routes.
 */
@Injectable()
export class SentryUserInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const req = context.switchToHttp().getRequest<{
			session?: { user?: { id?: string; email?: string } } | null;
		}>();
		const user = req.session?.user;
		if (user?.id) {
			Sentry.getCurrentScope().setUser({
				id: user.id,
				email: user.email,
			});
		}
		return next.handle();
	}
}
