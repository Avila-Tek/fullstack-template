import {
	type CallHandler,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '@/shared/types/api-response.types';
import { SKIP_API_RESPONSE } from './skip-api-response.decorator';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
	constructor(private readonly reflector: Reflector) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const skip = this.reflector.getAllAndOverride<boolean>(SKIP_API_RESPONSE, [
			context.getHandler(),
			context.getClass(),
		]);

		if (skip) return next.handle();

		const res = context.switchToHttp().getResponse<Response>();

		return next.handle().pipe(
			map(
				(data: unknown): ApiResponse<unknown> => ({
					code: res.statusCode,
					data: data ?? null,
					error: null,
					message: null,
					success: true,
				}),
			),
		);
	}
}
