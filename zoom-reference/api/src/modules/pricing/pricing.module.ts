import { Module } from '@nestjs/common';
import { LOGGER_PORT } from '@zoom/utils';
import { PinoLogger } from 'nestjs-pino';
import { BusinessProfileBillingCityReaderPort } from '@/modules/pricing/application/ports/out/business-profile-billing-city-reader.port';
import { BusinessProfileBillingCityReaderAdapter } from '@/modules/profiles/infrastructure/adapters/business-profile-billing-city-reader.adapter';
import { CatalogModule } from '../catalog/catalog.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { RegionModule } from '../region/region.module';
import { CalculateLockerPricingUseCasePort } from './application/ports/in/calculate-locker-pricing.use-case.port';
import { CalculateNationalGuiaQuoteUseCasePort } from './application/ports/in/calculate-national-guia-quote.use-case.port';
import { GetNationalQuoteLimitsUseCasePort } from './application/ports/in/get-national-quote-limits.use-case.port';
import { ResolveBillingOriginCityUseCasePort } from './application/ports/in/resolve-billing-origin-city.use-case.port';
import { ValidateLockerUseCasePort } from './application/ports/in/validate-locker.use-case.port';
import { PricingRuleRepositoryPort } from './application/ports/out/pricing-rule-repository.port';
import { CalculateLockerPricingUseCase } from './application/use-cases/calculate-locker-pricing.use-case';
import { CalculateNationalGuiaQuoteUseCase } from './application/use-cases/calculate-national-guia-quote.use-case';
import { GetNationalQuoteLimitsUseCase } from './application/use-cases/get-national-quote-limits.use-case';
import { ResolveBillingOriginCityUseCase } from './application/use-cases/resolve-billing-origin-city.use-case';
import { ValidateLockerUseCase } from './application/use-cases/validate-locker.use-case';
import { LockersValidateController } from './infrastructure/http/lockers-validate.controller';
import { PricingController } from './infrastructure/http/pricing.controller';
import { DrizzlePricingRuleRepository } from './infrastructure/persistence/drizzle-pricing-rule.repository';

/**
 * Pricing module — owns `national_overweight_rule`, `postal_tax_rule`,
 * `insurance_rule`, and `transport_charge_rule` (relocated in F1).
 *
 * Cross-module port bindings (`CatalogReaderPort`, `CityTaxRatesReaderPort`,
 * `LockerReaderPort`) are provided by the owning modules listed in `imports`
 * and resolved through Nest's DI cascade — no manual `useClass` wiring
 * needed here.
 *
 * Module boot order (per spec_back.md §Phase 2):
 *   DrizzleModule → CatalogModule → PricingModule → (consumers)
 */
@Module({
	imports: [CatalogModule, RegionModule, ProfilesModule],
	controllers: [PricingController, LockersValidateController],
	providers: [
		{ provide: LOGGER_PORT, useExisting: PinoLogger },
		{
			provide: PricingRuleRepositoryPort,
			useClass: DrizzlePricingRuleRepository,
		},
		{
			provide: BusinessProfileBillingCityReaderPort,
			useClass: BusinessProfileBillingCityReaderAdapter,
		},
		{
			provide: ValidateLockerUseCasePort,
			useClass: ValidateLockerUseCase,
		},
		{
			provide: ResolveBillingOriginCityUseCasePort,
			useClass: ResolveBillingOriginCityUseCase,
		},
		{
			provide: CalculateLockerPricingUseCasePort,
			useClass: CalculateLockerPricingUseCase,
		},
		{
			provide: CalculateNationalGuiaQuoteUseCasePort,
			useClass: CalculateNationalGuiaQuoteUseCase,
		},
		{
			provide: GetNationalQuoteLimitsUseCasePort,
			useClass: GetNationalQuoteLimitsUseCase,
		},
	],
	exports: [ValidateLockerUseCasePort],
})
export class PricingModule {}
