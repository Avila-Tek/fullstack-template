import type { ArgumentsHost } from '@nestjs/common';
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

import { AllExceptionsFilter } from '../../../src/infrastructure/filters/all-exceptions.filter';
import { incrementServerError } from '../../../src/shared/metrics/server-errors.metric';

function makeHost(
	jsonFn = vi.fn(),
	statusFn = vi.fn().mockReturnValue({ json: jsonFn }),
	acceptLanguage?: string,
): ArgumentsHost {
	return {
		switchToHttp: () => ({
			getRequest: () => ({
				headers: { 'accept-language': acceptLanguage },
			}),
			getResponse: () => ({ status: statusFn }),
		}),
	} as unknown as ArgumentsHost;
}

function makeLogger(): IStructuredLogger {
	return {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
	} as unknown as IStructuredLogger;
}

describe('AllExceptionsFilter', () => {
	it('responds HTTP 500 with INTERNAL_ERROR body and no internal details', () => {
		const jsonFn = vi.fn();
		const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
		const filter = new AllExceptionsFilter(makeLogger());

		filter.catch(new Error('secret db error'), makeHost(jsonFn, statusFn));

		expect(statusFn).toHaveBeenCalledWith(500);
		const body = jsonFn.mock.calls[0][0];
		expect(body).toMatchObject({
			success: false,
			code: 500,
			error: 'INTERNAL_ERROR',
			data: null,
		});
		expect(body.message).toBeDefined();
		expect(JSON.stringify(body)).not.toContain('secret db error');
	});

	it('returns localized message based on Accept-Language header', () => {
		const jsonFnEs = vi.fn();
		const jsonFnEn = vi.fn();
		const filter = new AllExceptionsFilter(makeLogger());

		filter.catch(
			new Error('x'),
			makeHost(jsonFnEs, vi.fn().mockReturnValue({ json: jsonFnEs }), 'es'),
		);
		filter.catch(
			new Error('x'),
			makeHost(jsonFnEn, vi.fn().mockReturnValue({ json: jsonFnEn }), 'en'),
		);

		expect(jsonFnEs.mock.calls[0][0].message).toBe(
			'Ocurrió un error inesperado.',
		);
		expect(jsonFnEn.mock.calls[0][0].message).toBe(
			'An unexpected error occurred.',
		);
	});

	it('calls logger.error with the unhandled event and error details', () => {
		const logger = makeLogger();
		const filter = new AllExceptionsFilter(logger);
		const err = new Error('boom');

		filter.catch(err, makeHost());

		const mockError = vi.mocked(logger.error as ReturnType<typeof vi.fn>);
		expect(mockError).toHaveBeenCalledOnce();
		const [meta] = mockError.mock.calls[0];
		expect(meta).toMatchObject({
			event: 'http.exception.unhandled',
			errorName: 'Error',
			message: 'boom',
		});
		expect((meta as Record<string, unknown>).stack).toBeDefined();
	});

	it('calls incrementServerError with zoom-auth labels', () => {
		const filter = new AllExceptionsFilter(makeLogger());

		filter.catch(new Error('x'), makeHost());

		expect(incrementServerError).toHaveBeenCalledWith({
			app: 'zoom-auth',
			status_code: '500',
			error_code: 'INTERNAL_ERROR',
		});
	});

	it('does not include exception.stack in the response body', () => {
		const jsonFn = vi.fn();
		const statusFn = vi.fn().mockReturnValue({ json: jsonFn });

		new AllExceptionsFilter(makeLogger()).catch(
			new Error('internal'),
			makeHost(jsonFn, statusFn),
		);

		const body = jsonFn.mock.calls[0][0];
		expect(JSON.stringify(body)).not.toContain('at ');
	});

	it('captures the exception to Sentry with handled:false mechanism', () => {
		mockCaptureException.mockClear();
		const err = new Error('boom');

		new AllExceptionsFilter(makeLogger()).catch(err, makeHost());

		expect(mockCaptureException).toHaveBeenCalledTimes(1);
		expect(mockCaptureException).toHaveBeenCalledWith(err, {
			mechanism: {
				handled: false,
				type: 'auto.http.nestjs.all_exceptions_filter',
			},
		});
	});

	it('captures non-Error exceptions to Sentry after wrapping in Error', () => {
		mockCaptureException.mockClear();

		new AllExceptionsFilter(makeLogger()).catch('string thrown', makeHost());

		expect(mockCaptureException).toHaveBeenCalledTimes(1);
		const [captured] = mockCaptureException.mock.calls[0];
		expect(captured).toBeInstanceOf(Error);
	});
});
