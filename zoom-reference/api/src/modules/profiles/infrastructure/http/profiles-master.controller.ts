import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	documentTypeItemSchema,
	getShippingUnitsOutputSchema,
	internationalPhonePrefixItemSchema,
	phonePrefixItemSchema,
	type TDocumentTypeItem,
	type TGetShippingUnitsOutput,
	type TInternationalPhonePrefixItem,
	type TPhonePrefixItem,
} from '@zoom/schemas';
import { ApiErrorResponses, ApiSafeResponse } from '@zoom/swagger';
import { z } from 'zod';
import { Public } from '../../../../shared/guards/public.decorator';
import { GetDocumentTypesUseCasePort } from '../../application/ports/in/get-document-types.use-case.port';
import { GetInternationalPhonePrefixesUseCasePort } from '../../application/ports/in/get-international-phone-prefixes.use-case.port';
import { GetPhonePrefixesUseCasePort } from '../../application/ports/in/get-phone-prefixes.use-case.port';
import { GetShippingUnitsUseCasePort } from '../../application/ports/in/get-shipping-units.use-case.port';

@ApiTags('Profiles')
@Controller('profiles')
@Public()
export class ProfilesMasterController {
	constructor(
		@Inject(GetDocumentTypesUseCasePort)
		private readonly documentTypesUseCase: GetDocumentTypesUseCasePort,
		@Inject(GetInternationalPhonePrefixesUseCasePort)
		private readonly intlPhonePrefixesUseCase: GetInternationalPhonePrefixesUseCasePort,
		@Inject(GetPhonePrefixesUseCasePort)
		private readonly phonePrefixesUseCase: GetPhonePrefixesUseCasePort,
		@Inject(GetShippingUnitsUseCasePort)
		private readonly shippingUnitsUseCase: GetShippingUnitsUseCasePort,
	) {}

	@Get('document-types')
	@ApiOperation({ summary: 'Get active document types' })
	@ApiSafeResponse(z.array(documentTypeItemSchema))
	@ApiErrorResponses(500)
	getDocumentTypes(): Promise<TDocumentTypeItem[]> {
		return this.documentTypesUseCase.execute();
	}

	@Get('international-phone-prefixes')
	@ApiOperation({ summary: 'Get active international phone prefixes' })
	@ApiSafeResponse(z.array(internationalPhonePrefixItemSchema))
	@ApiErrorResponses(500)
	getInternationalPhonePrefixes(): Promise<TInternationalPhonePrefixItem[]> {
		return this.intlPhonePrefixesUseCase.execute();
	}

	@Get('phone-prefixes')
	@ApiOperation({ summary: 'Get active phone prefixes' })
	@ApiSafeResponse(z.array(phonePrefixItemSchema))
	@ApiErrorResponses(500)
	getPhonePrefixes(): Promise<TPhonePrefixItem[]> {
		return this.phonePrefixesUseCase.execute();
	}

	@Get('units')
	@ApiOperation({ summary: 'Get active weight and dimension units' })
	@ApiSafeResponse(getShippingUnitsOutputSchema)
	@ApiErrorResponses(500)
	getShippingUnits(): Promise<TGetShippingUnitsOutput> {
		return this.shippingUnitsUseCase.execute();
	}
}
