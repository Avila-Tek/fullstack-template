import { Controller, Get, Inject, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	cityItemSchema,
	municipalityItemSchema,
	parishItemSchema,
	postalCodeItemSchema,
	stateItemSchema,
	type TCityItem,
	type TMunicipalityItem,
	type TParishItem,
	type TPostalCodeItem,
	type TStateItem,
} from '@zoom/schemas';
import { ApiErrorResponses, ApiSafeResponse, ApiZodQuery } from '@zoom/swagger';
import { z } from 'zod';
import { Public } from '../../../../shared/guards/public.decorator';
import { GetCitiesUseCasePort } from '../../application/ports/in/get-cities.use-case.port';
import { GetMunicipalitiesUseCasePort } from '../../application/ports/in/get-municipalities.use-case.port';
import { GetParishesUseCasePort } from '../../application/ports/in/get-parishes.use-case.port';
import { GetPostalCodesUseCasePort } from '../../application/ports/in/get-postal-codes.use-case.port';
import { GetStatesUseCasePort } from '../../application/ports/in/get-states.use-case.port';

@ApiTags('Region')
@Controller('region')
@Public()
export class RegionController {
	constructor(
		@Inject(GetStatesUseCasePort)
		private readonly getStates: GetStatesUseCasePort,
		@Inject(GetCitiesUseCasePort)
		private readonly getCities: GetCitiesUseCasePort,
		@Inject(GetMunicipalitiesUseCasePort)
		private readonly getMunicipalities: GetMunicipalitiesUseCasePort,
		@Inject(GetParishesUseCasePort)
		private readonly getParishes: GetParishesUseCasePort,
		@Inject(GetPostalCodesUseCasePort)
		private readonly getPostalCodes: GetPostalCodesUseCasePort,
	) {}

	@Get('states')
	@ApiOperation({
		summary: 'Get active states for a country (defaults to Venezuela)',
	})
	@ApiZodQuery({
		countryId: z.uuid().optional(),
	})
	@ApiSafeResponse(z.array(stateItemSchema))
	@ApiErrorResponses(400, 422, 500)
	getStatesByCountry(
		@Query('countryId', new ParseUUIDPipe({ optional: true }))
		countryId?: string,
	): Promise<TStateItem[]> {
		return this.getStates.execute(countryId);
	}

	@Get('cities')
	@ApiOperation({
		summary: 'Get active cities (optionally filtered by state)',
	})
	@ApiZodQuery({
		stateId: z.uuid().optional(),
	})
	@ApiSafeResponse(z.array(cityItemSchema))
	@ApiErrorResponses(400, 422, 500)
	getCitiesByState(
		@Query('stateId', new ParseUUIDPipe({ optional: true }))
		stateId?: string,
	): Promise<TCityItem[]> {
		return this.getCities.execute(stateId);
	}

	@Get('municipalities')
	@ApiOperation({ summary: 'Get active municipalities for a state' })
	@ApiZodQuery({
		stateId: z.uuid(),
	})
	@ApiSafeResponse(z.array(municipalityItemSchema))
	@ApiErrorResponses(400, 422, 500)
	getMunicipalitiesByState(
		@Query('stateId', new ParseUUIDPipe()) stateId: string,
	): Promise<TMunicipalityItem[]> {
		return this.getMunicipalities.execute(stateId);
	}

	@Get('parishes')
	@ApiOperation({ summary: 'Get active parishes for a municipality' })
	@ApiZodQuery({
		municipalityId: z.uuid(),
	})
	@ApiSafeResponse(z.array(parishItemSchema))
	@ApiErrorResponses(400, 422, 500)
	getParishesByMunicipality(
		@Query('municipalityId', new ParseUUIDPipe()) municipalityId: string,
	): Promise<TParishItem[]> {
		return this.getParishes.execute(municipalityId);
	}

	@Get('postal-codes')
	@ApiOperation({ summary: 'Get active postal codes for a city' })
	@ApiZodQuery({
		cityId: z.uuid(),
	})
	@ApiSafeResponse(z.array(postalCodeItemSchema))
	@ApiErrorResponses(400, 422, 500)
	getPostalCodesByCity(
		@Query('cityId', new ParseUUIDPipe()) cityId: string,
	): Promise<TPostalCodeItem[]> {
		return this.getPostalCodes.execute(cityId);
	}
}
