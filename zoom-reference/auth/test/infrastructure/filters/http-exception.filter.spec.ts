import type { ArgumentsHost } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import type { IStructuredLogger } from '@zoom/utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/shared/metrics/server-errors.metric', () => ({
	incrementServerError: vi.fn(),
}));

const { mockCaptureException } = vi.hoisted(() => ({
	mockCaptureException: vi.fn(),
}));

vi.mock('@sentry/nestjs', () => ({
	captureException: mockCaptureException,
}));

import { HttpExceptionFilter } from '../../../src/infrastructure/filters/http-exception.filter';
import { incrementServerError } from '../../../src/shared/metrics/server-errors.metric';

function makeHost(): {
	host: ArgumentsHost;
	statusFn: ReturnType<typeof vi.fn>;
	jsonFn: ReturnType<typeof vi.fn>;
} {
	const jsonFn = vi.fn();
	const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
	const host = {
		switchToHttp: () => ({
			getRequest: () => ({ headers: { 'accept-language': 'en' } }),
			getResponse: () => ({ status: statusFn }),
		}),
	} as unknown as ArgumentsHost;
	return { host, statusFn, jsonFn };
}

function makeLogger(): IStructuredLogger {
	return {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
	} as unknown as IStructuredLogger;
}

describe('HttpExceptionFilter', () => {
	describe('5xx errors', () => {
		it('calls logger.error with server_error event and increments metric', () => {
			const logger = makeLogger();
			const { host } = makeHost();

			new HttpExceptionFilter(logger).catch(
				new HttpException('Internal failure', 500),
				host,
			);

			const mockError = vi.mocked(logger.error as ReturnType<typeof vi.fn>);
			expect(mockError).toHaveBeenCalledOnce();
			const [meta] = mockError.mock.calls[0];
			expect(meta).toMatchObject({
				event: 'http.exception.server_error',
				status: 500,
			});
			expect(incrementServerError).toHaveBeenCalledOnce();
			expect(
				vi.mocked(logger.warn as ReturnType<typeof vi.fn>),
			).not.toHaveBeenCalled();
		});

		it('returns generic message in 500 response body', () => {
			const { host, statusFn, jsonFn } = makeHost();

			new HttpExceptionFilter(makeLogger()).catch(
				new HttpException('secret message', 500),
				host,
			);

			expect(statusFn).toHaveBeenCalledWith(500);
			const body = jsonFn.mock.calls[0][0];
			expect(body.message).toBe('An unexpected error occurred.');
			expect(JSON.stringify(body)).not.toContain('secret message');
		});

		it('captures the exception to Sentry with handled:true mechanism', () => {
			mockCaptureException.mockClear();
			const exception = new HttpException('Internal failure', 500);

			new HttpExceptionFilter(makeLogger()).catch(exception, makeHost().host);

			expect(mockCaptureException).toHaveBeenCalledTimes(1);
			expect(mockCaptureException).toHaveBeenCalledWith(exception, {
				mechanism: {
					handled: true,
					type: 'auto.http.nestjs.http_exception_filter',
				},
			});
		});
	});

	describe('4xx errors', () => {
		it('calls logger.warn with client_error event and does NOT increment metric', () => {
			const logger = makeLogger();
			vi.mocked(incrementServerError).mockClear();
			const { host } = makeHost();

			new HttpExceptionFilter(logger).catch(
				new HttpException('Bad input', 400),
				host,
			);

			const mockWarn = vi.mocked(logger.warn as ReturnType<typeof vi.fn>);
			expect(mockWarn).toHaveBeenCalledOnce();
			const [meta] = mockWarn.mock.calls[0];
			expect(meta).toMatchObject({
				event: 'http.exception.client_error',
				status: 400,
			});
			expect(
				vi.mocked(logger.error as ReturnType<typeof vi.fn>),
			).not.toHaveBeenCalled();
			expect(incrementServerError).not.toHaveBeenCalled();
		});

		it('does NOT capture to Sentry for client errors', () => {
			mockCaptureException.mockClear();

			new HttpExceptionFilter(makeLogger()).catch(
				new HttpException('Bad input', 422),
				makeHost().host,
			);

			expect(mockCaptureException).not.toHaveBeenCalled();
		});
	});
});
