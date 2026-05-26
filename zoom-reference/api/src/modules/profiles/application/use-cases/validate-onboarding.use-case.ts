import { Injectable } from '@nestjs/common';
import type {
	TValidateOnboardingInput,
	TValidateOnboardingOutput,
} from '@zoom/schemas';
import { CityRepositoryPort } from '../../../region/application/ports/out/city-repository.port';
import { CountryRepositoryPort } from '../../../region/application/ports/out/country-repository.port';
import { MunicipalityRepositoryPort } from '../../../region/application/ports/out/municipality-repository.port';
import { ParishRepositoryPort } from '../../../region/application/ports/out/parish-repository.port';
import { PostalCodeRepositoryPort } from '../../../region/application/ports/out/postal-code-repository.port';
import { StateRepositoryPort } from '../../../region/application/ports/out/state-repository.port';
import { CityNotFoundException } from '../../../region/domain/exceptions/city-not-found.exception';
import { CountryNotFoundException } from '../../../region/domain/exceptions/country-not-found.exception';
import { MunicipalityNotFoundException } from '../../../region/domain/exceptions/municipality-not-found.exception';
import { ParishNotFoundException } from '../../../region/domain/exceptions/parish-not-found.exception';
import { PostalCodeNotFoundException } from '../../../region/domain/exceptions/postal-code-not-found.exception';
import { StateNotFoundException } from '../../../region/domain/exceptions/state-not-found.exception';
import { BusinessIdentityConflictException } from '../../domain/exceptions/business-identity-conflict.exception';
import { DocumentTypeNotFoundException } from '../../domain/exceptions/document-type-not-found.exception';
import { OwnerAlreadyExistsException } from '../../domain/exceptions/owner-already-exists.exception';
import { PhonePrefixNotFoundException } from '../../domain/exceptions/phone-prefix-not-found.exception';
import { ValidateOnboardingUseCasePort } from '../ports/in/validate-onboarding.use-case.port';
import { BusinessAccountRepositoryPort } from '../ports/out/business-account-repository.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import { DocumentTypeMasterRepositoryPort } from '../ports/out/document-type-master-repository.port';
import { PhonePrefixMasterRepositoryPort } from '../ports/out/phone-prefix-master-repository.port';

@Injectable()
export class ValidateOnboardingUseCase
	implements ValidateOnboardingUseCasePort
{
	constructor(
		private readonly documentTypeRepo: DocumentTypeMasterRepositoryPort,
		private readonly phonePrefixRepo: PhonePrefixMasterRepositoryPort,
		private readonly businessAccountRepo: BusinessAccountRepositoryPort,
		private readonly businessProfileRepo: BusinessProfileRepositoryPort,
		private readonly countryRepo: CountryRepositoryPort,
		private readonly stateRepo: StateRepositoryPort,
		private readonly cityRepo: CityRepositoryPort,
		private readonly municipalityRepo: MunicipalityRepositoryPort,
		private readonly parishRepo: ParishRepositoryPort,
		private readonly postalCodeRepo: PostalCodeRepositoryPort,
	) {}

	async execute(
		input: TValidateOnboardingInput,
	): Promise<TValidateOnboardingOutput> {
		const { profile, billingAddress } = input;

		// Country resolution runs first — it can throw, and we don't want
		// unrelated in-flight queries dangling on the connection pool if it does.
		const countryId = await this.resolveCountryId(billingAddress.countryId);

		// All remaining independent lookups run in parallel
		const [
			docType,
			phonePrefix,
			existingProfile,
			stateRow,
			cityRow,
			municipalityRow,
			parishRow,
			postalCodeRow,
		] = await Promise.all([
			this.documentTypeRepo.findByCode(profile.documentType),
			this.phonePrefixRepo.findByPrefix(profile.phonePrefix),
			this.businessProfileRepo.findOwnerByUserId(input.userId),
			this.findIfProvided(billingAddress.stateId, (id) =>
				this.stateRepo.findById(id),
			),
			this.findIfProvided(billingAddress.cityId, (id) =>
				this.cityRepo.findById(id),
			),
			this.findIfProvided(billingAddress.municipalityId, (id) =>
				this.municipalityRepo.findById(id),
			),
			this.findIfProvided(billingAddress.parishId, (id) =>
				this.parishRepo.findById(id),
			),
			this.findIfProvided(billingAddress.postalCodeId, (id) =>
				this.postalCodeRepo.findById(id),
			),
		]);

		if (docType === null) {
			throw new DocumentTypeNotFoundException({
				documentType: profile.documentType,
			});
		}
		if (phonePrefix === null) {
			throw new PhonePrefixNotFoundException({
				prefix: profile.phonePrefix,
			});
		}
		if (existingProfile !== null) {
			throw new OwnerAlreadyExistsException({ userId: input.userId });
		}
		if (billingAddress.stateId && stateRow === null) {
			throw new StateNotFoundException({ stateId: billingAddress.stateId });
		}
		if (billingAddress.cityId && cityRow === null) {
			throw new CityNotFoundException({ cityId: billingAddress.cityId });
		}
		if (billingAddress.municipalityId && municipalityRow === null) {
			throw new MunicipalityNotFoundException({
				municipalityId: billingAddress.municipalityId,
			});
		}
		if (billingAddress.parishId && parishRow === null) {
			throw new ParishNotFoundException({ parishId: billingAddress.parishId });
		}
		if (billingAddress.postalCodeId && postalCodeRow === null) {
			throw new PostalCodeNotFoundException({
				postalCodeId: billingAddress.postalCodeId,
			});
		}

		// Depends on docType.id — runs after the parallel group
		const documentExists = await this.businessAccountRepo.existsByDocument(
			docType.id,
			profile.documentNumber,
		);
		if (documentExists) {
			throw new BusinessIdentityConflictException({
				documentType: profile.documentType,
				documentNumber: profile.documentNumber,
			});
		}

		return {
			countryId,
			profile: {
				documentTypeId: docType.id,
				phonePrefixId: phonePrefix.id,
				documentType: profile.documentType,
				phonePrefix: profile.phonePrefix,
			},
		};
	}

	private async resolveCountryId(countryId?: string): Promise<string> {
		const country = countryId
			? await this.countryRepo.findById(countryId)
			: await this.countryRepo.findDefault();
		if (country === null) {
			throw new CountryNotFoundException({ countryId });
		}
		return country.id;
	}

	private findIfProvided(
		id: string | undefined,
		finder: (id: string) => Promise<{ id: string } | null>,
	): Promise<{ id: string } | null> {
		return id ? finder(id) : Promise.resolve(null);
	}
}
