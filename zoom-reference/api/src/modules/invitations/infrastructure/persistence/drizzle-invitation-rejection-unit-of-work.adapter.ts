import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { DrizzleBusinessProfileRepositoryAdapter } from '../../../profiles/infrastructure/persistence/drizzle-business-profile-repository.adapter';
import type { RejectionRepos } from '../../application/ports/out/invitation-rejection-unit-of-work.port';
import { InvitationRejectionUnitOfWorkPort } from '../../application/ports/out/invitation-rejection-unit-of-work.port';
import { DrizzleInvitationRepositoryAdapter } from './drizzle-invitation-repository.adapter';

@Injectable()
export class DrizzleInvitationRejectionUnitOfWorkAdapter
	implements InvitationRejectionUnitOfWorkPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async run(fn: (repos: RejectionRepos) => Promise<void>): Promise<void> {
		await this.db.transaction(async (tx) => {
			return fn({
				invite: new DrizzleInvitationRepositoryAdapter(tx),
				businessProfile: new DrizzleBusinessProfileRepositoryAdapter(tx),
			});
		});
	}
}
