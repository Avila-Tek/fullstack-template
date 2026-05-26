import { Module } from '@nestjs/common';
import { LOGGER_PORT } from '@zoom/utils';
import { PinoLogger } from 'nestjs-pino';
import { CityTaxRatesReaderPort } from '../pricing/application/ports/out/city-tax-rates-reader.port';
import { GetCitiesUseCasePort } from './application/ports/in/get-cities.use-case.port';
import { GetMunicipalitiesUseCasePort } from './application/ports/in/get-municipalities.use-case.port';
import { GetParishesUseCasePort } from './application/ports/in/get-parishes.use-case.port';
import { GetPostalCodesUseCasePort } from './application/ports/in/get-postal-codes.use-case.port';
import { GetStatesUseCasePort } from './application/ports/in/get-states.use-case.port';
import { CityRepositoryPort } from './application/ports/out/city-repository.port';
import { CountryRepositoryPort } from './application/ports/out/country-repository.port';
import { MunicipalityRepositoryPort } from './application/ports/out/municipality-repository.port';
import { ParishRepositoryPort } from './application/ports/out/parish-repository.port';
import { PostalCodeRepositoryPort } from './application/ports/out/postal-code-repository.port';
import { StateRepositoryPort } from './application/ports/out/state-repository.port';
import { GetCitiesUseCase } from './application/use-cases/get-cities.use-case';
import { GetMunicipalitiesUseCase } from './application/use-cases/get-municipalities.use-case';
import { GetParishesUseCase } from './application/use-cases/get-parishes.use-case';
import { GetPostalCodesUseCase } from './application/use-cases/get-postal-codes.use-case';
import { GetStatesUseCase } from './application/use-cases/get-states.use-case';
import { CityTaxRatesReaderAdapter } from './infrastructure/adapters/city-tax-rates-reader.adapter';
import { RegionController } from './infrastructure/http/region.controller';
import { DrizzleCityRepositoryAdapter } from './infrastructure/persistence/drizzle-city-repository.adapter';
import { DrizzleCountryRepositoryAdapter } from './infrastructure/persistence/drizzle-country-repository.adapter';
import { DrizzleMunicipalityRepositoryAdapter } from './infrastructure/persistence/drizzle-municipality-repository.adapter';
import { DrizzleParishRepositoryAdapter } from './infrastructure/persistence/drizzle-parish-repository.adapter';
import { DrizzlePostalCodeRepositoryAdapter } from './infrastructure/persistence/drizzle-postal-code-repository.adapter';
import { DrizzleStateRepositoryAdapter } from './infrastructure/persistence/drizzle-state-repository.adapter';

@Module({
	controllers: [RegionController],
	providers: [
		{ provide: LOGGER_PORT, useExisting: PinoLogger },
		{
			provide: CountryRepositoryPort,
			useClass: DrizzleCountryRepositoryAdapter,
		},
		{ provide: StateRepositoryPort, useClass: DrizzleStateRepositoryAdapter },
		{ provide: CityRepositoryPort, useClass: DrizzleCityRepositoryAdapter },
		{
			provide: MunicipalityRepositoryPort,
			useClass: DrizzleMunicipalityRepositoryAdapter,
		},
		{ provide: ParishRepositoryPort, useClass: DrizzleParishRepositoryAdapter },
		{
			provide: PostalCodeRepositoryPort,
			useClass: DrizzlePostalCodeRepositoryAdapter,
		},
		{ provide: GetStatesUseCasePort, useClass: GetStatesUseCase },
		{ provide: GetCitiesUseCasePort, useClass: GetCitiesUseCase },
		{
			provide: GetMunicipalitiesUseCasePort,
			useClass: GetMunicipalitiesUseCase,
		},
		{ provide: GetParishesUseCasePort, useClass: GetParishesUseCase },
		{ provide: GetPostalCodesUseCasePort, useClass: GetPostalCodesUseCase },
		{
			provide: CityTaxRatesReaderPort,
			useClass: CityTaxRatesReaderAdapter,
		},
	],
	exports: [
		CountryRepositoryPort,
		StateRepositoryPort,
		CityRepositoryPort,
		MunicipalityRepositoryPort,
		ParishRepositoryPort,
		PostalCodeRepositoryPort,
		CityTaxRatesReaderPort,
	],
})
export class RegionModule {}
