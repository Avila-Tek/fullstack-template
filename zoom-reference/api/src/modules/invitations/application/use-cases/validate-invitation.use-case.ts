import { Inject, Injectable } from '@nestjs/common';
import type {
	TValidateInvitationCommand,
	TValidateInvitationOutput,
} from '@zoom/schemas';
import { BusinessProfileRepositoryPort } from '../../../profiles/application/ports/out/business-profile-repository.port';
import { DocumentTypeMasterRepositoryPort } from '../../../profiles/application/ports/out/document-type-master-repository.port';
import { PhonePrefixMasterRepositoryPort } from '../../../profiles/application/ports/out/phone-prefix-master-repository.port';
import { DocumentTypeNotFoundException } from '../../../profiles/domain/exceptions/document-type-not-found.exception';
import { PhonePrefixNotFoundException } from '../../../profiles/domain/exceptions/phone-prefix-not-found.exception';
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
import { InvitationDuplicatePendingException } from '../../domain/exceptions/invitation-duplicate-pending.exception';
import { InvitationEmailAlreadyMemberException } from '../../domain/exceptions/invitation-email-already-member.exception';
import { InvitationOwnerOnlyException } from '../../domain/exceptions/invitation-owner-only.exception';
import { InvitationRoleTemplateNotFoundException } from '../../domain/exceptions/invitation-role-template-not-found.exception';
import { Email } from '../../domain/value-objects/email.value-object';
import { ValidateInvitationUseCasePort } from '../ports/in/validate-invitation.use-case.port';
import { InvitationRepositoryPort } from '../ports/out/invitation-repository.port';
import { InvitationRoleTemplateRepositoryPort } from '../ports/out/invitation-role-template-repository.port';

@Injectable()
export class ValidateInvitationUseCase
	implements ValidateInvitationUseCasePort
{
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly businessProfileRepo: BusinessProfileRepositoryPort,
		@Inject(InvitationRepositoryPort)
		private readonly invitationRepo: InvitationRepositoryPort,
		@Inject(DocumentTypeMasterRepositoryPort)
		private readonly documentTypeRepo: DocumentTypeMasterRepositoryPort,
		@Inject(PhonePrefixMasterRepositoryPort)
		private readonly phonePrefixRepo: PhonePrefixMasterRepositoryPort,
		@Inject(InvitationRoleTemplateRepositoryPort)
		private readonly roleTemplateRepo: InvitationRoleTemplateRepositoryPort,
		@Inject(CountryRepositoryPort)
		private readonly countryRepo: CountryRepositoryPort,
		@Inject(StateRepositoryPort)
		private readonly stateRepo: StateRepositoryPort,
		@Inject(CityRepositoryPort)
		private readonly cityRepo: CityRepositoryPort,
		@Inject(MunicipalityRepositoryPort)
		private readonly municipalityRepo: MunicipalityRepositoryPort,
		@Inject(ParishRepositoryPort)
		private readonly parishRepo: ParishRepositoryPort,
		@Inject(PostalCodeRepositoryPort)
		private readonly postalCodeRepo: PostalCodeRepositoryPort,
	) {}

	async execute(
		cmd: TValidateInvitationCommand,
	): Promise<TValidateInvitationOutput> {
		const { profile, permissions, billingAddress } = cmd;

		// Country resolution runs first — defaults to Venezuela when not supplied
		const countryId = await this.resolveCountryId(billingAddress.countryId);

		// BR-01: Caller must be owner of the target business account
		const ownerProfile = await this.businessProfileRepo.findOwnerInAccount(
			cmd.callerUserId,
			cmd.businessAccountId,
		);
		if (ownerProfile === null) {
			throw new InvitationOwnerOnlyException({
				callerUserId: cmd.callerUserId,
				businessAccountId: cmd.businessAccountId,
			});
		}

		const normalizedEmail = Email.fromRaw(profile.email);

		// All independent lookups in parallel — fail fast on any error
		const [
			hasPending,
			existingMember,
			docType,
			phonePrefix,
			roleTemplate,
			stateRow,
			cityRow,
			municipalityRow,
			parishRow,
			postalCodeRow,
		] = await Promise.all([
			// BR-02: No duplicate pending invite for (account, email)
			this.invitationRepo.hasPendingInviteForEmail(
				cmd.businessAccountId,
				normalizedEmail.value,
			),
			// BR-NEW: Email must not already be active/invited in any business account
			this.businessProfileRepo.findActiveOrInvitedByEmail(
				normalizedEmail.value,
			),
			// Resolve document type from document type code
			this.documentTypeRepo.findByCode(profile.documentType),
			// Resolve phone prefix
			this.phonePrefixRepo.findByPrefix(profile.phonePrefix),
			// Validate role template exists and is not deleted (skip when not provided)
			this.findIfProvided(permissions.roleTemplateId, (id) =>
				this.roleTemplateRepo.findWithDefaults(id),
			),
			// Validate optional region IDs
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

		if (hasPending) {
			throw new InvitationDuplicatePendingException({
				businessAccountId: cmd.businessAccountId,
				normalizedEmail: normalizedEmail.value,
			});
		}

		if (existingMember !== null) {
			throw new InvitationEmailAlreadyMemberException({
				normalizedEmail: normalizedEmail.value,
			});
		}

		if (permissions.roleTemplateId && roleTemplate === null) {
			throw new InvitationRoleTemplateNotFoundException({
				roleTemplateId: permissions.roleTemplateId,
			});
		}

		if (docType === null) {
			// Reuse the same exception used by onboarding for consistency
			throw new DocumentTypeNotFoundException({
				documentType: profile.documentType,
			});
		}

		if (phonePrefix === null) {
			throw new PhonePrefixNotFoundException({
				prefix: profile.phonePrefix,
			});
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

		return {
			countryId,
			profile: {
				normalizedEmail: normalizedEmail.value,
				documentTypeId: docType.id,
				documentType: profile.documentType,
				phonePrefixId: phonePrefix.id,
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
