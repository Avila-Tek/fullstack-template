import type { ArgumentsHost } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { IStructuredLogger } from '@/shared/domain-utils';
import { HttpExceptionFilter } from '../../../infrastructure/filters/http-exception.filter';

vi.mock('../../../shared/metrics/server-errors.metric', () => ({
	incrementServerError: vi.fn(),
}));

import { incrementServerError } from '../../../shared/metrics/server-errors.metric';

function makeHost(): {
	host: ArgumentsHost;
	statusFn: ReturnType<typeof vi.fn>;
	jsonFn: ReturnType<typeof vi.fn>;
} {
	const jsonFn = vi.fn();
	const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
	const host = {
		switchToHttp: () => ({ getResponse: () => ({ status: statusFn }) }),
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
	});
});
