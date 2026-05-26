import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { DrizzleAddressRepositoryAdapter } from '../../../profiles/infrastructure/persistence/drizzle-address-repository.adapter';
import { DrizzleBusinessProfileRepositoryAdapter } from '../../../profiles/infrastructure/persistence/drizzle-business-profile-repository.adapter';
import type {
	InvitationRepos,
	InvitationUnitOfWorkPort,
} from '../../application/ports/out/invitation-unit-of-work.port';
import { DrizzleBusinessProfilePermissionRepositoryAdapter } from './drizzle-business-profile-permission-repository.adapter';
import { DrizzleBusinessProfileServiceRepositoryAdapter } from './drizzle-business-profile-service-repository.adapter';
import { DrizzleInvitationRepositoryAdapter } from './drizzle-invitation-repository.adapter';

@Injectable()
export class DrizzleInvitationUnitOfWorkAdapter
	implements InvitationUnitOfWorkPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async run<T>(work: (repos: InvitationRepos) => Promise<T>): Promise<T> {
		return this.db.transaction(async (tx) => {
			return work({
				address: new DrizzleAddressRepositoryAdapter(tx),
				businessProfile: new DrizzleBusinessProfileRepositoryAdapter(tx),
				invitation: new DrizzleInvitationRepositoryAdapter(tx),
				businessProfileService:
					new DrizzleBusinessProfileServiceRepositoryAdapter(tx),
				businessProfilePermission:
					new DrizzleBusinessProfilePermissionRepositoryAdapter(tx),
			});
		});
	}
}
