import {
	Body,
	Controller,
	ForbiddenException,
	Get,
	Headers,
	HttpCode,
	HttpStatus,
	Inject,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	calculateLockerPricingCommandSchema,
	calculateNationalPricingCommandSchema,
	lockerPricingPublicResponseSchema,
	nationalPricingResponseSchema,
	nationalQuoteLimitsQuerySchema,
	nationalQuoteLimitsResponseSchema,
	type TCalculateNationalPricingCommand,
	type TLockerPricingPublicResponse,
	type TLockerPricingResponse,
	type TNationalPricingResponse,
	type TNationalQuoteLimitsResponse,
	type TShippingServiceKey,
} from '@zoom/schemas';
import {
	ApiErrorResponses,
	ApiSafeResponse,
	ApiZodBody,
	ApiZodQuery,
	createZodDto,
} from '@zoom/swagger';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { CalculateNationalGuiaQuoteUseCasePort } from '@/modules/pricing/application/ports/in/calculate-national-guia-quote.use-case.port';
import { CurrentPermissions } from '@/shared/guards/current-permissions.decorator';
import type { ResolvedPermissions } from '@/shared/permissions/resolved-permissions.type';
import type { JwtUser } from '../../../../shared/guards/current-user.decorator';
import { CurrentUser } from '../../../../shared/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { RequirePermissions } from '../../../../shared/guards/require-permissions.decorator';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { CalculateLockerPricingUseCasePort } from '../../application/ports/in/calculate-locker-pricing.use-case.port';
import { GetNationalQuoteLimitsUseCasePort } from '../../application/ports/in/get-national-quote-limits.use-case.port';
import { ResolveBillingOriginCityUseCasePort } from '../../application/ports/in/resolve-billing-origin-city.use-case.port';
import { BcvRateMissingException } from '../../domain/exceptions/bcv-rate-missing.exception';

class CalculateNationalPricingBodyDto extends createZodDto(
	calculateNationalPricingCommandSchema,
) {}

class CalculateLockerPricingBodyDto extends createZodDto(
	calculateLockerPricingCommandSchema,
) {}

class NationalQuoteLimitsQueryDto extends createZodDto(
	nationalQuoteLimitsQuerySchema,
) {}

/**
 * Projects the rich internal `TLockerPricingResponse` (produced by the use
 * case) down to the 8-field public wire shape rendered by the Cotizador
 * cost panel. Internal-only fields (serviceCode, branch, vatPercentage,
 * detail.*) stay server-side — they exist for telemetry, logs, and future UI
 * needs but are not part of the HTTP contract.
 */
function toPublicResponse(
	full: TLockerPricingResponse,
): TLockerPricingPublicResponse {
	return {
		freight: full.freight,
		insurance: full.insurance,
		subtotal: full.subtotal,
		vat: full.vat,
		postalTax: full.postalTax,
		total: full.total,
		bcvRate: full.bcvRate,
		totalUsd: full.totalUsd,
	};
}

/**
 * Parse and validate the `x-bcv-rate` header. The orchestrator's
 * `BcvRateInjectionMiddleware` strips any client-supplied value and injects
 * the freshly-fetched BCV rate before forwarding the request, so a missing
 * or invalid header here always indicates a deployment/configuration
 * failure — mapped to HTTP 500 by `BcvRateMissingException`.
 */
function parseBcvRateHeader(raw: string | undefined): number {
	if (!raw) {
		throw new BcvRateMissingException();
	}
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new BcvRateMissingException();
	}
	return parsed;
}

@ApiTags('pricing')
@Controller('pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PricingController {
	constructor(
		@Inject(CalculateNationalGuiaQuoteUseCasePort)
		private readonly calculateNationalQuote: CalculateNationalGuiaQuoteUseCasePort,
		@Inject(CalculateLockerPricingUseCasePort)
		private readonly calculateLockerPricing: CalculateLockerPricingUseCasePort,
		@Inject(GetNationalQuoteLimitsUseCasePort)
		private readonly getNationalQuoteLimits: GetNationalQuoteLimitsUseCasePort,
		@Inject(ResolveBillingOriginCityUseCasePort)
		private readonly resolveBillingOriginCity: ResolveBillingOriginCityUseCasePort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	@Post('casillero/calculate')
	@HttpCode(HttpStatus.OK)
	@RequirePermissions({ services: ['national_locker'] })
	@ApiOperation({
		summary: 'Calculate the pricing breakdown for a national locker shipment',
	})
	@ApiZodBody(calculateLockerPricingCommandSchema)
	@ApiSafeResponse(lockerPricingPublicResponseSchema, 200)
	@ApiErrorResponses(400, 401, 403, 422, 500)
	async calculateCasillero(
		@Body() body: CalculateLockerPricingBodyDto,
		@CurrentUser() user: JwtUser,
		@Headers('x-bcv-rate') bcvRateHeader: string | undefined,
	): Promise<TLockerPricingPublicResponse> {
		const bcvRate = parseBcvRateHeader(bcvRateHeader);

		// LEGACY: origin city comes from `$_SESSION['codciudadori']` set at
		// login. The new design resolves it via a dedicated use case (throws
		// PRICING_ORIGIN_CITY_NOT_CONFIGURED on null).
		const originCityId = await this.resolveBillingOriginCity.execute({
			userId: user.sub,
		});

		const startedAt = Date.now();
		const response = await this.calculateLockerPricing.execute({
			...body,
			originCityId,
			bcvRate,
		});

		// VS2.7 telemetry: fire on every successful execution. Captures
		// codservicio + branch + peso + latency per story §7. No PII beyond
		// userId. Telemetry uses the rich internal response — `serviceCode`
		// and `branch` are not on the wire but are valuable for logs.
		this.logger.info(
			{
				event: 'quote.locker.requested',
				userId: user.sub,
				codservicio: response.serviceCode,
				branch: response.branch,
				peso: body.weight,
				latencyMs: Date.now() - startedAt,
			},
			`Casillero pricing computed (codservicio=${response.serviceCode}, branch=${response.branch})`,
		);
		recordApiEvent('quote.locker.requested', {
			module: 'pricing',
			outcome: 'success',
		});

		return toPublicResponse(response);
	}

	/**
	 * `POST /api/v1/pricing/national/calculate`
	 *
	 * Computes the Nacional guía pricing (Domicilio / Retiro en oficina) for
	 * the authenticated caller.
	 *
	 * DESIGN DECISION — `originCityId` is a CLIENT input (selected in the
	 * cotizador's origin-city picker). The endpoint does NOT resolve it
	 * from the caller's business profile or account. See the schema header
	 * in `packages/schemas/src/pricing/national-guide-pricing.schema.ts`
	 * for the full rationale.
	 *
	 * Permission gates:
	 *   1. ROUTE-LEVEL (`@RequirePermissions`, OR-gate): caller must have at
	 *      least one of `national_guia_origin` or `national_guia_destination`.
	 *      Anyone without either is rejected by `PermissionsGuard` before
	 *      the controller runs.
	 *   2. BR-08 (defense-in-depth, in-controller): the SPECIFIC permission
	 *      required depends on `paymentType`:
	 *        - paymentType='origin'      → `national_guia_origin`
	 *        - paymentType='destination' → `national_guia_destination`
	 *      A user with `origin` but not `destination` cannot quote a COD
	 *      shipment, and vice versa. We read the already-resolved snapshot
	 *      via `@CurrentPermissions()` — no extra DB roundtrip.
	 */
	@Post('national/calculate')
	@HttpCode(HttpStatus.OK)
	@RequirePermissions({
		operator: 'OR',
		services: ['national_guia_origin', 'national_guia_destination'],
	})
	@ApiOperation({
		summary:
			'Calculate national shipment pricing (Domicilio / Retiro en oficina)',
	})
	@ApiZodBody(calculateNationalPricingCommandSchema)
	@ApiSafeResponse(nationalPricingResponseSchema, 200)
	@ApiErrorResponses(400, 401, 403, 422, 500)
	async calculateNational(
		@Body() body: CalculateNationalPricingBodyDto,
		@CurrentPermissions() perms: ResolvedPermissions,
		@Headers('x-bcv-rate') bcvRateHeader: string | undefined,
	): Promise<TNationalPricingResponse> {
		this.assertVariantEntitlement(perms, body.paymentType);
		const bcvRate = parseBcvRateHeader(bcvRateHeader);
		return this.calculateNationalQuote.execute({ ...body, bcvRate });
	}

	/**
	 * `GET /api/v1/pricing/national/quote-limits`
	 *
	 * Returns the weight ceiling + declared-value bounds the calculate
	 * endpoint enforces, so the cotizador form can validate client-side
	 * (Weight, Declared Value) without hitting `/calculate` to discover them.
	 *
	 * Bounds are returned in USD. The use case computes the internal Bs
	 * bounds against the insurance rule and projects them via
	 * `convertBsToUsd` using the rate parsed from `x-bcv-rate`.
	 */
	@Get('national/limits')
	@RequirePermissions({
		operator: 'OR',
		services: ['national_guia_origin', 'national_guia_destination'],
	})
	@ApiOperation({
		summary:
			'Get weight + declared-value limits for the national guía cotizador',
	})
	@ApiZodQuery(nationalQuoteLimitsQuerySchema.shape)
	@ApiSafeResponse(nationalQuoteLimitsResponseSchema, 200)
	@ApiErrorResponses(400, 401, 403, 404, 422, 500)
	async getNationalLimits(
		@Query() query: NationalQuoteLimitsQueryDto,
		@Headers('x-bcv-rate') bcvRateHeader: string | undefined,
	): Promise<TNationalQuoteLimitsResponse> {
		const bcvRate = parseBcvRateHeader(bcvRateHeader);
		return this.getNationalQuoteLimits.execute({ ...query, bcvRate });
	}

	private assertVariantEntitlement(
		perms: ResolvedPermissions,
		paymentType: TCalculateNationalPricingCommand['paymentType'],
	): void {
		const requiredKey: TShippingServiceKey =
			paymentType === 'destination'
				? 'national_guia_destination'
				: 'national_guia_origin';
		const service = perms.services.get(requiredKey);
		if (!service?.enabled) {
			throw new ForbiddenException('Insufficient permissions.');
		}
	}
}
