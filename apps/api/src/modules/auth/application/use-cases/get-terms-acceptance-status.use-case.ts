import { Inject, Injectable } from '@nestjs/common';
import type { TTermsAcceptanceStatusResponse } from '@zoom/schemas';
import {
	type GetTermsAcceptanceStatusInput,
	GetTermsAcceptanceStatusUseCasePort,
} from '../ports/in/get-terms-acceptance-status.use-case.port';
import { TermsRepositoryPort } from '../ports/out/terms-repository.port';
import { UserTermsAcceptanceRepositoryPort } from '../ports/out/user-terms-acceptance-repository.port';

@Injectable()
export class GetTermsAcceptanceStatusUseCase
	implements GetTermsAcceptanceStatusUseCasePort
{
	constructor(
		@Inject(TermsRepositoryPort)
		private readonly termsRepo: TermsRepositoryPort,
		@Inject(UserTermsAcceptanceRepositoryPort)
		private readonly acceptanceRepo: UserTermsAcceptanceRepositoryPort,
	) {}

	async execute(
		input: GetTermsAcceptanceStatusInput,
	): Promise<TTermsAcceptanceStatusResponse> {
		const { userId, systemId } = input;

		const activeTerms = await this.termsRepo.findActiveBySystemId(systemId);
		if (!activeTerms) {
			return {
				requiresAcceptance: false,
				activeVersion: null,
				acceptedVersion: null,
			};
		}

		const latestAcceptance =
			await this.acceptanceRepo.findLatestByUserAndSystem(userId, systemId);

		if (!latestAcceptance) {
			return {
				requiresAcceptance: true,
				activeVersion: activeTerms.version,
				acceptedVersion: null,
			};
		}

		const acceptedTerms = await this.termsRepo.findById(
			latestAcceptance.systemTermsId,
		);
		const acceptedVersion = acceptedTerms?.version ?? null;
		const requiresAcceptance =
			latestAcceptance.systemTermsId !== activeTerms.id;

		return {
			requiresAcceptance,
			activeVersion: activeTerms.version,
			acceptedVersion,
		};
	}
}
