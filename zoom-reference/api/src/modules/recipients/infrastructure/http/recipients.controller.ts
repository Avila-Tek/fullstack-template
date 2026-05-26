import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Inject,
	Post,
	UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	createRecipientInternationalInputSchema,
	createRecipientInternationalOutputSchema,
	createRecipientLockerInternalSchema,
	createRecipientLockerOutputSchema,
	createRecipientNationalInputSchema,
	createRecipientNationalOutputSchema,
	type TCreateRecipientInternationalOutput,
	type TCreateRecipientLockerOutput,
	type TCreateRecipientNationalOutput,
} from '@zoom/schemas';
import {
	ApiErrorResponses,
	ApiSafeResponse,
	ApiZodBody,
	createZodDto,
} from '@zoom/swagger';
import { z } from 'zod';
import { InternalServiceGuard } from '../../../../shared/guards/internal-service.guard';
import { Public } from '../../../../shared/guards/public.decorator';
import type { CreateRecipientInternationalCommand } from '../../application/ports/in/create-recipient-international.use-case.port';
import { CreateRecipientInternationalUseCasePort } from '../../application/ports/in/create-recipient-international.use-case.port';
import type { CreateRecipientLockerCommand } from '../../application/ports/in/create-recipient-locker.use-case.port';
import { CreateRecipientLockerUseCasePort } from '../../application/ports/in/create-recipient-locker.use-case.port';
import type { CreateRecipientNationalCommand } from '../../application/ports/in/create-recipient-national.use-case.port';
import { CreateRecipientNationalUseCasePort } from '../../application/ports/in/create-recipient-national.use-case.port';

const geocodingSchema = z.object({
	lat: z.string(),
	lng: z.string(),
	formatted_address: z.string(),
	route: z.string().optional(),
	provider_id: z.string(),
});

const createRecipientInternalSchema = createRecipientNationalInputSchema.extend(
	{
		user_id: z.uuid(),
		business_account_id: z.uuid(),
		owner_business_profile_id: z.uuid(),
		is_business_account_owner: z.boolean(),
		geocoding: geocodingSchema.optional(),
	},
);

type CreateRecipientInternalInput = z.infer<
	typeof createRecipientInternalSchema
>;

class CreateRecipientInternalBodyDto extends createZodDto(
	createRecipientInternalSchema,
) {}

const createRecipientInternationalInternalSchema =
	createRecipientInternationalInputSchema.extend({
		business_account_id: z.uuid(),
		owner_business_profile_id: z.uuid(),
		is_business_account_owner: z.boolean(),
	});

type CreateRecipientInternationalInternalInput = z.infer<
	typeof createRecipientInternationalInternalSchema
>;

class CreateRecipientInternationalInternalBodyDto extends createZodDto(
	createRecipientInternationalInternalSchema,
) {}

class CreateRecipientLockerInternalBodyDto extends createZodDto(
	createRecipientLockerInternalSchema,
) {}

@ApiTags('Recipients (Internal)')
@Controller('internal/recipients')
@Public()
@UseGuards(InternalServiceGuard)
export class RecipientsController {
	constructor(
		@Inject(CreateRecipientNationalUseCasePort)
		private readonly createNationalUseCase: CreateRecipientNationalUseCasePort,
		@Inject(CreateRecipientInternationalUseCasePort)
		private readonly createInternationalUseCase: CreateRecipientInternationalUseCasePort,
		@Inject(CreateRecipientLockerUseCasePort)
		private readonly createLockerUseCase: CreateRecipientLockerUseCasePort,
	) {}

	@Post('national')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Create a national Guía recipient (internal)' })
	@ApiZodBody(createRecipientInternalSchema)
	@ApiSafeResponse(createRecipientNationalOutputSchema, 201)
	@ApiErrorResponses(400, 422, 500)
	createNational(
		@Body() body: CreateRecipientInternalBodyDto,
	): Promise<TCreateRecipientNationalOutput> {
		const raw = body as unknown as CreateRecipientInternalInput;
		const cmd: CreateRecipientNationalCommand = {
			name: raw.name,
			alias: raw.alias,
			documentTypeId: raw.document_type_id,
			documentNumber: raw.document_number,
			stateId: raw.state_id,
			cityId: raw.city_id,
			addressLong: raw.address_long,
			contactName: raw.contact_name,
			cellphonePrefixId: raw.cellphone_prefix_id,
			cellphoneNumber: raw.cellphone_number,
			locality: raw.locality,
			phonePrefixId: raw.phone_prefix_id,
			phoneNumber: raw.phone_number,
			email: raw.email,
			observation: raw.observation,
			userId: raw.user_id,
			businessAccountId: raw.business_account_id,
			ownerBusinessProfileId: raw.owner_business_profile_id,
			isBusinessAccountOwner: raw.is_business_account_owner,
			geocoding: raw.geocoding
				? {
						lat: raw.geocoding.lat,
						lng: raw.geocoding.lng,
						formattedAddress: raw.geocoding.formatted_address,
						route: raw.geocoding.route,
						providerId: raw.geocoding.provider_id,
					}
				: undefined,
		};
		return this.createNationalUseCase.execute(cmd);
	}

	@Post('international')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({
		summary: 'Create an international Guía recipient (internal)',
	})
	@ApiZodBody(createRecipientInternationalInternalSchema)
	@ApiSafeResponse(createRecipientInternationalOutputSchema, 201)
	@ApiErrorResponses(400, 422, 500)
	createInternational(
		@Body() body: CreateRecipientInternationalInternalBodyDto,
	): Promise<TCreateRecipientInternationalOutput> {
		const raw = body as unknown as CreateRecipientInternationalInternalInput;
		const cmd: CreateRecipientInternationalCommand = {
			name: raw.name,
			alias: raw.alias,
			internationalDocument: raw.international_document,
			internationalShippingCountryCode: raw.international_shipping_country_code,
			internationalShippingCountryName: raw.international_shipping_country_name,
			internationalShippingCityName: raw.international_shipping_city_name,
			internationalShippingCityZipCode:
				raw.international_shipping_city_zip_code,
			internationalShippingCitySuburb: raw.international_shipping_city_suburb,
			addressLong: raw.address_long,
			locality: raw.locality,
			contactName: raw.contact_name,
			internationalCellphonePrefixId: raw.international_cellphone_prefix_id,
			cellphoneNumber: raw.cellphone_number,
			internationalPhonePrefixId: raw.international_phone_prefix_id,
			phoneNumber: raw.phone_number,
			email: raw.email,
			observation: raw.observation,
			businessAccountId: raw.business_account_id,
			ownerBusinessProfileId: raw.owner_business_profile_id,
			isBusinessAccountOwner: raw.is_business_account_owner,
		};
		return this.createInternationalUseCase.execute(cmd);
	}

	@Post('locker')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Create a locker recipient (internal)' })
	@ApiZodBody(createRecipientLockerInternalSchema)
	@ApiSafeResponse(createRecipientLockerOutputSchema, 201)
	@ApiErrorResponses(400, 422, 500)
	createLocker(
		@Body() body: CreateRecipientLockerInternalBodyDto,
	): Promise<TCreateRecipientLockerOutput> {
		const cmd: CreateRecipientLockerCommand = {
			siglas: body.siglas,
			lockerNumber: body.locker_number,
			contactName: body.contact_name,
			alias: body.alias,
			cellphonePrefixId: body.cellphone_prefix_id,
			cellphoneNumber: body.cellphone_number,
			observation: body.observation,
			userId: body.user_id,
			businessAccountId: body.business_account_id,
			ownerBusinessProfileId: body.owner_business_profile_id,
			isBusinessAccountOwner: body.is_business_account_owner,
		};
		return this.createLockerUseCase.execute(cmd);
	}
}
