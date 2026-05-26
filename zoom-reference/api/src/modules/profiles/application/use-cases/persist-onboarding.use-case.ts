import { Injectable } from '@nestjs/common';
import type {
	TPersistOnboardingCommand,
	TPersistOnboardingOutput,
} from '@zoom/schemas';
import { LEGACY_ID_DEVOLVER } from '../../domain/constants/return-type-legacy-ids';
import { DefaultDimensionUnitNotFoundException } from '../../domain/exceptions/default-dimension-unit-not-found.exception';
import { DefaultReturnTypeNotFoundException } from '../../domain/exceptions/default-return-type-not-found.exception';
import { DefaultWeightUnitNotFoundException } from '../../domain/exceptions/default-weight-unit-not-found.exception';
import { PersistOnboardingUseCasePort } from '../ports/in/persist-onboarding.use-case.port';
import { OnboardingUnitOfWorkPort } from '../ports/out/onboarding-unit-of-work.port';
import { ReturnTypeMasterRepositoryPort } from '../ports/out/return-type-master-repository.port';
import {
	UNIT_TYPE_CODE_DIMENSION,
	UNIT_TYPE_CODE_WEIGHT,
	UnitOfMeasureMasterRepositoryPort,
} from '../ports/out/unit-of-measure-master-repository.port';

@Injectable()
export class PersistOnboardingUseCase implements PersistOnboardingUseCasePort {
	constructor(
		private readonly unitOfWork: OnboardingUnitOfWorkPort,
		private readonly unitOfMeasureMaster: UnitOfMeasureMasterRepositoryPort,
		private readonly returnTypeMaster: ReturnTypeMasterRepositoryPort,
	) {}

	async execute(
		cmd: TPersistOnboardingCommand,
	): Promise<TPersistOnboardingOutput> {
		// Resolve catalog defaults before opening the transaction (parallel reads)
		const [weightUnit, dimensionUnit, returnTypes] = await Promise.all([
			this.unitOfMeasureMaster.findFirstActiveByTypeCode(UNIT_TYPE_CODE_WEIGHT),
			this.unitOfMeasureMaster.findFirstActiveByTypeCode(
				UNIT_TYPE_CODE_DIMENSION,
			),
			this.returnTypeMaster.findActiveByLegacyIds([LEGACY_ID_DEVOLVER]),
		]);
		if (weightUnit === null) {
			throw new DefaultWeightUnitNotFoundException();
		}
		if (dimensionUnit === null) {
			throw new DefaultDimensionUnitNotFoundException();
		}
		const returnType = returnTypes[0];
		if (returnType === undefined) {
			throw new DefaultReturnTypeNotFoundException();
		}

		const businessAccountId = await this.unitOfWork.run(
			async ({
				address,
				businessAccount,
				businessProfile,
				businessProfileSettings,
				businessProfileReturnPreference,
				notificationPreference,
			}) => {
				const { profile, billingAddress } = cmd;

				const addr = await address.create({
					// formattedAddress is NOT NULL in the DB. When geolocation is
					// unavailable the orchestrator omits this field, so we fall back
					// to addressLine1.
					formattedAddress:
						billingAddress.formattedAddress ?? billingAddress.addressLine1,
					addressLine1: billingAddress.addressLine1,
					addressLine2: billingAddress.addressLine2 ?? null,
					rawQuery: billingAddress.rawQuery ?? null,
					suburbText: billingAddress.suburbText ?? null,
					postalCodeText: billingAddress.postalCodeText ?? null,
					internationalCityText: billingAddress.internationalCityText ?? null,
					countryId: billingAddress.countryId,
					stateId: billingAddress.stateId ?? null,
					cityId: billingAddress.cityId ?? null,
					municipalityId: billingAddress.municipalityId ?? null,
					parishId: billingAddress.parishId ?? null,
					postalCodeId: billingAddress.postalCodeId ?? null,
					geoLat:
						billingAddress.geoLat != null
							? String(billingAddress.geoLat)
							: null,
					geoLng:
						billingAddress.geoLng != null
							? String(billingAddress.geoLng)
							: null,
					geolocationProvider: billingAddress.geolocationProvider ?? null,
					providerAddressId: billingAddress.providerAddressId ?? null,
					providerRouteCode: billingAddress.providerRouteCode ?? null,
					supportedByZoom: billingAddress.supportedByZoom ?? false,
					validatedAt: billingAddress.validatedAt ?? null,
				});

				const acct = await businessAccount.create({
					coreClientCode: cmd.clientCode,
					coreClientStatus: cmd.clientStatus,
					documentTypeId: profile.documentTypeId,
					documentType: profile.documentType,
					documentNumber: profile.documentNumber,
					firstName: profile.firstName ?? null,
					lastName: profile.lastName ?? null,
					legalName: profile.legalName,
					phonePrefixId: profile.phonePrefixId,
					phonePrefix: profile.phonePrefix,
					phoneNumber: profile.phoneNumber,
					email: profile.email,
					billingAddressId: addr.id,
				});

				const businessProfileRecord = await businessProfile.create({
					documentTypeId: profile.documentTypeId,
					documentType: profile.documentType,
					documentNumber: profile.documentNumber,
					firstName: profile.firstName ?? null,
					lastName: profile.lastName ?? null,
					legalName: profile.legalName,
					phonePrefixId: profile.phonePrefixId,
					phonePrefix: profile.phonePrefix,
					phoneNumber: profile.phoneNumber,
					email: profile.email,
					billingAddressId: addr.id,
					businessAccountId: acct.id,
					userId: profile.userId,
					role: 'owner',
				});

				// Step 6 — initialize default profile settings
				await businessProfileSettings.create({
					businessProfileId: businessProfileRecord.id,
					internationalMaritimeWeightUnitId: weightUnit.id,
					internationalMaritimeDimensionUnitId: dimensionUnit.id,
					// printGuide and printQrLabel default to false via DB default
				});

				// Step 7 — initialize default return preference
				// NOTE: returnTypeId is a placeholder default; the first active
				// return_type_master record is used because no return type has been
				// explicitly selected at onboarding time. The user can update this
				// later from the profile settings screen.
				await businessProfileReturnPreference.create({
					businessProfileId: businessProfileRecord.id,
					returnTypeId: returnType.id,
					returnTo: 'address',
					returnAddressId: addr.id,
					returnOfficeId: null,
					lockerMasterId: null,
					notes: null,
				});

				// Step 8 — initialize default notification preference (emailEnabled=true)
				await notificationPreference.create(businessProfileRecord.id);

				return acct.id;
			},
		);

		return { businessAccountId };
	}
}
