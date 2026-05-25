import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { DrizzleBusinessProfilePermissionRepositoryAdapter } from '../../../invitations/infrastructure/persistence/drizzle-business-profile-permission-repository.adapter';
import { DrizzleBusinessProfileServiceRepositoryAdapter } from '../../../invitations/infrastructure/persistence/drizzle-business-profile-service-repository.adapter';
import type { EditProfileRepos } from '../../application/ports/out/edit-profile-unit-of-work.port';
import { EditProfileUnitOfWorkPort } from '../../application/ports/out/edit-profile-unit-of-work.port';
import { DrizzleAddressRepositoryAdapter } from './drizzle-address-repository.adapter';
import { DrizzleBusinessAccountRepositoryAdapter } from './drizzle-business-account-repository.adapter';
import { DrizzleBusinessProfileRepositoryAdapter } from './drizzle-business-profile-repository.adapter';

@Injectable()
export class DrizzleEditProfileUnitOfWorkAdapter
	implements EditProfileUnitOfWorkPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async run<T>(work: (repos: EditProfileRepos) => Promise<T>): Promise<T> {
		return this.db.transaction(async (tx) => {
			return work({
				address: new DrizzleAddressRepositoryAdapter(tx),
				businessAccount: new DrizzleBusinessAccountRepositoryAdapter(tx),
				businessProfile: new DrizzleBusinessProfileRepositoryAdapter(tx),
				businessProfileService:
					new DrizzleBusinessProfileServiceRepositoryAdapter(tx),
				businessProfilePermission:
					new DrizzleBusinessProfilePermissionRepositoryAdapter(tx),
			});
		});
	}
}
