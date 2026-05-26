import type { ArgumentsHost } from '@nestjs/common';
import { DomainException, type IStructuredLogger } from '@zoom/utils';
import { describe, expect, it, vi } from 'vitest';

const { mockCaptureException, mockSetTag } = vi.hoisted(() => ({
	mockCaptureException: vi.fn(),
	mockSetTag: vi.fn(),
}));

vi.mock('@sentry/nestjs', () => ({
	captureException: mockCaptureException,
	getCurrentScope: () => ({ setTag: mockSetTag }),
}));

import { DomainExceptionFilter } from '../../../src/infrastructure/filters/domain-exception.filter';
import type { DomainToHttpMapper } from '../../../src/infrastructure/mapping/domain-to-http.mapper';

function makeMapper(status: number): DomainToHttpMapper {
	return {
		map: vi.fn().mockReturnValue(status),
	} as unknown as DomainToHttpMapper;
}

function makeHost(): {
	host: ArgumentsHost;
	statusFn: ReturnType<typeof vi.fn>;
	jsonFn: ReturnType<typeof vi.fn>;
} {
	const jsonFn = vi.fn();
	const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
	const host = {
		switchToHttp: () => ({
			getRequest: () => ({ headers: {} }),
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

describe('DomainExceptionFilter', () => {
	describe('5xx mapped errors', () => {
		it('captures to Sentry with handled:true and httpStatus hint data', () => {
			mockCaptureException.mockClear();
			mockSetTag.mockClear();
			const filter = new DomainExceptionFilter(makeLogger(), makeMapper(500));
			const exception = new DomainException('AUTH_INTERNAL_ERROR');

			filter.catch(exception, makeHost().host);

			expect(mockCaptureException).toHaveBeenCalledTimes(1);
			expect(mockCaptureException).toHaveBeenCalledWith(exception, {
				mechanism: {
					handled: true,
					type: 'auto.http.nestjs.domain_exception_filter',
				},
				data: { httpStatus: 500 },
			});
		});

		it('tags the scope with domain_error before capture', () => {
			mockCaptureException.mockClear();
			mockSetTag.mockClear();
			const filter = new DomainExceptionFilter(makeLogger(), makeMapper(500));
			const exception = new DomainException('AUTH_SOMETHING_BROKE');

			filter.catch(exception, makeHost().host);

			expect(mockSetTag).toHaveBeenCalledWith(
				'domain_error',
				'AUTH_SOMETHING_BROKE',
			);
		});

		it('returns a generic INTERNAL_ERROR body (the raw domain code does not reach the client)', () => {
			const { host, statusFn, jsonFn } = makeHost();
			const filter = new DomainExceptionFilter(makeLogger(), makeMapper(500));

			filter.catch(new DomainException('AUTH_UNEXPECTED'), host);

			expect(statusFn).toHaveBeenCalledWith(500);
			const body = jsonFn.mock.calls[0][0];
			// Status ≥ 500 always resolves to INTERNAL_ERROR — the original
			// code stays in logs + on the Sentry domain_error tag.
			expect(body).toMatchObject({
				success: false,
				code: 500,
				error: 'INTERNAL_ERROR',
				data: null,
			});
			expect(body.error).not.toBe('AUTH_UNEXPECTED');
		});
	});

	describe('4xx mapped errors', () => {
		it('does NOT capture to Sentry for client-mapped domain errors (404)', () => {
			mockCaptureException.mockClear();
			mockSetTag.mockClear();
			const filter = new DomainExceptionFilter(makeLogger(), makeMapper(404));

			filter.catch(new DomainException('AUTH_USER_NOT_FOUND'), makeHost().host);

			expect(mockCaptureException).not.toHaveBeenCalled();
		});

		it('does NOT set domain_error tag for 4xx errors', () => {
			mockCaptureException.mockClear();
			mockSetTag.mockClear();
			const filter = new DomainExceptionFilter(makeLogger(), makeMapper(422));

			filter.catch(new DomainException('AUTH_INVALID_INPUT'), makeHost().host);

			expect(mockSetTag).not.toHaveBeenCalled();
		});

		it('writes the 4xx response body unchanged', () => {
			const { host, statusFn, jsonFn } = makeHost();
			const filter = new DomainExceptionFilter(makeLogger(), makeMapper(404));

			filter.catch(new DomainException('AUTH_USER_NOT_FOUND'), host);

			expect(statusFn).toHaveBeenCalledWith(404);
			const body = jsonFn.mock.calls[0][0];
			expect(body).toMatchObject({
				success: false,
				code: 404,
				error: 'AUTH_USER_NOT_FOUND',
				data: null,
			});
		});
	});
});
