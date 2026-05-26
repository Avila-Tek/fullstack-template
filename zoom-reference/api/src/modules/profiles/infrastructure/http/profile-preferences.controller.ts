import {
	Body,
	Controller,
	Get,
	Inject,
	ParseUUIDPipe,
	Patch,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	getCitiesWithOfficesOutputSchema,
	getOfficesByCityOutputSchema,
	getPreferencesOutputSchema,
	getProfileAddressOutputSchema,
	getReturnDataOutputSchema,
	getReturnTypesOutputSchema,
	notificationPreferenceOutputSchema,
	type TGetCitiesWithOfficesOutput,
	type TGetOfficesByCityOutput,
	type TGetPreferencesOutput,
	type TGetProfileAddressOutput,
	type TGetReturnDataOutput,
	type TGetReturnTypesOutput,
	type TNotificationPreferenceOutput,
	updateNotificationPreferenceInputSchema,
	updatePreferencesInputSchema,
	updateReturnDataInputSchema,
} from '@zoom/schemas';
import {
	ApiErrorResponses,
	ApiSafeResponse,
	ApiZodBody,
	ApiZodQuery,
	createZodDto,
} from '@zoom/swagger';
import { z } from 'zod';
import type { JwtUser } from '../../../../shared/guards/current-user.decorator';
import { CurrentUser } from '../../../../shared/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { GetCitiesWithOfficesUseCasePort } from '../../application/ports/in/get-cities-with-offices.use-case.port';
import { GetNotificationPreferenceUseCasePort } from '../../application/ports/in/get-notification-preference.use-case.port';
import { GetOfficesByCityUseCasePort } from '../../application/ports/in/get-offices-by-city.use-case.port';
import { GetProfileAddressUseCasePort } from '../../application/ports/in/get-profile-address.use-case.port';
import { GetReturnPreferenceUseCasePort } from '../../application/ports/in/get-return-preference.use-case.port';
import { GetReturnTypesUseCasePort } from '../../application/ports/in/get-return-types.use-case.port';
import { GetUserPreferencesUseCasePort } from '../../application/ports/in/get-user-preferences.use-case.port';
import { UpdateNotificationPreferenceUseCasePort } from '../../application/ports/in/update-notification-preference.use-case.port';
import { UpdateReturnPreferenceUseCasePort } from '../../application/ports/in/update-return-preference.use-case.port';
import { UpdateUserPreferencesUseCasePort } from '../../application/ports/in/update-user-preferences.use-case.port';

class UpdatePreferencesBodyDto extends createZodDto(
	updatePreferencesInputSchema,
) {}

class UpdateNotificationPreferenceBodyDto extends createZodDto(
	updateNotificationPreferenceInputSchema,
) {}

class UpdateReturnDataBodyDto extends createZodDto(
	updateReturnDataInputSchema,
) {}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Profile Preferences')
@Controller('profile/preferences')
export class ProfilePreferencesController {
	constructor(
		@Inject(GetUserPreferencesUseCasePort)
		private readonly getPreferencesUseCase: GetUserPreferencesUseCasePort,
		@Inject(UpdateUserPreferencesUseCasePort)
		private readonly updatePreferencesUseCase: UpdateUserPreferencesUseCasePort,
		@Inject(GetNotificationPreferenceUseCasePort)
		private readonly getNotificationPreference: GetNotificationPreferenceUseCasePort,
		@Inject(UpdateNotificationPreferenceUseCasePort)
		private readonly updateNotificationPreference: UpdateNotificationPreferenceUseCasePort,
		@Inject(GetReturnTypesUseCasePort)
		private readonly getReturnTypesUseCase: GetReturnTypesUseCasePort,
		@Inject(GetReturnPreferenceUseCasePort)
		private readonly getReturnPreferenceUseCase: GetReturnPreferenceUseCasePort,
		@Inject(UpdateReturnPreferenceUseCasePort)
		private readonly updateReturnPreferenceUseCase: UpdateReturnPreferenceUseCasePort,
		@Inject(GetProfileAddressUseCasePort)
		private readonly getProfileAddressUseCase: GetProfileAddressUseCasePort,
		@Inject(GetCitiesWithOfficesUseCasePort)
		private readonly getCitiesWithOfficesUseCase: GetCitiesWithOfficesUseCasePort,
		@Inject(GetOfficesByCityUseCasePort)
		private readonly getOfficesByCityUseCase: GetOfficesByCityUseCasePort,
	) {}

	@Get()
	@ApiOperation({ summary: 'Get current user general preferences' })
	@ApiSafeResponse(getPreferencesOutputSchema)
	@ApiErrorResponses(401, 404, 500)
	getPreferences(@CurrentUser() user: JwtUser): Promise<TGetPreferencesOutput> {
		return this.getPreferencesUseCase.execute(user.sub);
	}

	@Patch()
	@ApiOperation({ summary: 'Update current user general preferences' })
	@ApiZodBody(updatePreferencesInputSchema)
	@ApiSafeResponse(getPreferencesOutputSchema)
	@ApiErrorResponses(400, 401, 404, 422, 500)
	updatePreferences(
		@CurrentUser() user: JwtUser,
		@Body() body: UpdatePreferencesBodyDto,
	): Promise<TGetPreferencesOutput> {
		return this.updatePreferencesUseCase.execute(user.sub, body);
	}

	@Get('notifications')
	@ApiOperation({ summary: 'Get current user notification preference' })
	@ApiSafeResponse(notificationPreferenceOutputSchema)
	@ApiErrorResponses(401, 404, 500)
	getNotifications(
		@CurrentUser() user: JwtUser,
	): Promise<TNotificationPreferenceOutput> {
		return this.getNotificationPreference.execute(user.sub);
	}

	@Patch('notifications')
	@ApiOperation({ summary: 'Update current user notification preference' })
	@ApiZodBody(updateNotificationPreferenceInputSchema)
	@ApiSafeResponse(notificationPreferenceOutputSchema)
	@ApiErrorResponses(400, 401, 404, 500)
	updateNotifications(
		@CurrentUser() user: JwtUser,
		@Body() body: UpdateNotificationPreferenceBodyDto,
	): Promise<TNotificationPreferenceOutput> {
		return this.updateNotificationPreference.execute(user.sub, body.preference);
	}

	@Get('return-data/return-types')
	@ApiOperation({ summary: 'List available return types' })
	@ApiSafeResponse(getReturnTypesOutputSchema)
	@ApiErrorResponses(401, 500)
	getReturnTypes(): Promise<TGetReturnTypesOutput> {
		return this.getReturnTypesUseCase.execute();
	}

	@Get('return-data')
	@ApiOperation({ summary: 'Get current user return preference' })
	@ApiSafeResponse(getReturnDataOutputSchema)
	@ApiErrorResponses(401, 404, 500)
	getReturnData(@CurrentUser() user: JwtUser): Promise<TGetReturnDataOutput> {
		return this.getReturnPreferenceUseCase.execute(user.sub);
	}

	@Patch('return-data')
	@ApiOperation({ summary: 'Update current user return preference' })
	@ApiZodBody(updateReturnDataInputSchema)
	@ApiSafeResponse(getReturnDataOutputSchema)
	@ApiErrorResponses(400, 401, 404, 422, 500)
	updateReturnData(
		@CurrentUser() user: JwtUser,
		@Body() body: UpdateReturnDataBodyDto,
	): Promise<TGetReturnDataOutput> {
		return this.updateReturnPreferenceUseCase.execute(user.sub, body);
	}

	@Get('return-data/address')
	@ApiOperation({
		summary: 'Get resolved profile address for return data display',
	})
	@ApiSafeResponse(getProfileAddressOutputSchema)
	@ApiErrorResponses(401, 404, 422, 500)
	getProfileAddress(
		@CurrentUser() user: JwtUser,
	): Promise<TGetProfileAddressOutput> {
		return this.getProfileAddressUseCase.execute(user.sub);
	}

	@Get('return-data/cities')
	@ApiOperation({ summary: 'List cities with active offices' })
	@ApiSafeResponse(getCitiesWithOfficesOutputSchema)
	@ApiErrorResponses(401, 500)
	getCitiesWithOffices(): Promise<TGetCitiesWithOfficesOutput> {
		return this.getCitiesWithOfficesUseCase.execute();
	}

	@Get('return-data/offices')
	@ApiOperation({ summary: 'List active offices in a city' })
	@ApiZodQuery({ cityId: z.string().uuid() })
	@ApiSafeResponse(getOfficesByCityOutputSchema)
	@ApiErrorResponses(400, 401, 422, 500)
	getOfficesByCity(
		@Query('cityId', new ParseUUIDPipe()) cityId: string,
	): Promise<TGetOfficesByCityOutput> {
		return this.getOfficesByCityUseCase.execute(cityId);
	}
}
