import type { TTermsAcceptanceResponse } from '@zoom/schemas';
import { TermsNoActiveVersionException } from '../../domain/exceptions/terms-no-active-version.exception';
import type {
	AcceptTermsInput,
	AcceptTermsUseCasePort,
} from '../ports/in/accept-terms.use-case.port';
import type { TermsRepositoryPort } from '../ports/out/terms-repository.port';
import type { UserTermsAcceptanceRepositoryPort } from '../ports/out/user-terms-acceptance-repository.port';

export class AcceptTermsUseCase implements AcceptTermsUseCasePort {
	constructor(
		private readonly termsRepo: TermsRepositoryPort,
		private readonly acceptanceRepo: UserTermsAcceptanceRepositoryPort,
	) {}

	async execute(input: AcceptTermsInput): Promise<TTermsAcceptanceResponse> {
		const { userId, systemId, sessionId, ipAddress, userAgent } = input;

		const activeTerms = await this.termsRepo.findActiveBySystemId(systemId);
		if (!activeTerms) throw new TermsNoActiveVersionException({ systemId });

		await this.acceptanceRepo.create({
			userId,
			systemId,
			systemTermsId: activeTerms.id,
			sessionId,
			ipAddress,
			userAgent,
		});

		return { accepted: true, version: activeTerms.version };
	}
}
