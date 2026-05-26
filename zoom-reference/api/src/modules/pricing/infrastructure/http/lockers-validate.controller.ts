import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	lockerValidationResponseSchema,
	type TLockerValidationResponse,
	validateLockerQuerySchema,
} from '@zoom/schemas';
import {
	ApiErrorResponses,
	ApiSafeResponse,
	ApiZodQuery,
	createZodDto,
} from '@zoom/swagger';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import type { JwtUser } from '../../../../shared/guards/current-user.decorator';
import { CurrentUser } from '../../../../shared/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { ValidateLockerUseCasePort } from '../../application/ports/in/validate-locker.use-case.port';

class ValidateLockerQueryDto extends createZodDto(validateLockerQuerySchema) {}

/**
 * `GET /api/v1/catalog/lockers/validate?siglas=…&lockerNumber=…`
 *
 * Predicate validator used by the polymorphic Cotizador form for live
 * feedback as the user types siglas + locker number. Returns ONLY
 * `{ valid: boolean }` — every failure mode (not found, inactive locker,
 * inactive client, family_code=17, missing office siglas, siglas mismatch)
 * collapses to `200 { valid: false }`. The granular `failureCode` is
 * logged server-side as `quote.locker.validation_error` for observability
 * but is NEVER returned on the wire (security: prevents locker enumeration,
 * customer-status probing, and office-config disclosure — see spec_back
 * §"Public response status codes").
 *
 * No `@RequirePermissions` decorator: pre-validation is open to any
 * authenticated caller, regardless of whether they have `national_locker`
 * service entitlement. The permission gate lives on the calculate endpoint
 * (VS2.5).
 */
@ApiTags('catalog')
@Controller('catalog/lockers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class LockersValidateController {
	constructor(
		@Inject(ValidateLockerUseCasePort)
		private readonly validateLockerUseCase: ValidateLockerUseCasePort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	@Get('validate')
	@ApiOperation({
		summary:
			'Validate a locker (siglas + lockerNumber) — returns only { valid: boolean }',
	})
	@ApiZodQuery(validateLockerQuerySchema.shape)
	@ApiSafeResponse(lockerValidationResponseSchema, 200)
	@ApiErrorResponses(400, 401, 500)
	async validate(
		@Query() query: ValidateLockerQueryDto,
		@CurrentUser() user: JwtUser,
	): Promise<TLockerValidationResponse> {
		const result = await this.validateLockerUseCase.execute(query);

		if (!result.valid) {
			// VS1.5 telemetry: fire on every `valid:false` outcome. The
			// failureCode is recorded server-side for analytics, NOT exposed
			// to the client (see class JSDoc).
			this.logger.warn(
				{
					event: 'quote.locker.validation_error',
					failureCode: result.failureCode,
					userId: user.sub,
					siglas: query.siglas,
					number: query.lockerNumber,
				},
				`Locker validation failed: ${result.failureCode}`,
			);
			recordApiEvent('quote.locker.validation_error', {
				module: 'pricing',
				outcome: 'failure',
				error_code: result.failureCode,
			});
		}

		return { valid: result.valid };
	}
}
