import { Inject, Injectable } from '@nestjs/common';
import {
	PERMISSION_KEY_VALUES,
	SHIPPING_SERVICE_KEY_VALUES,
} from '@zoom/schemas';
import type { ResolvedPermissions } from '../../../shared/permissions/resolved-permissions.type';
import { BusinessProfilePermissionRepositoryPort } from '../../invitations/application/ports/out/business-profile-permission-repository.port';
import { BusinessProfileServiceRepositoryPort } from '../../invitations/application/ports/out/business-profile-service-repository.port';
import type { ProfileRecord } from './ports/out/business-profile-repository.port';
import { BusinessProfileRepositoryPort } from './ports/out/business-profile-repository.port';

@Injectable()
export class PermissionResolver {
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly profileRepo: BusinessProfileRepositoryPort,
		@Inject(BusinessProfileServiceRepositoryPort)
		private readonly serviceRepo: BusinessProfileServiceRepositoryPort,
		@Inject(BusinessProfilePermissionRepositoryPort)
		private readonly permissionsRepo: BusinessProfilePermissionRepositoryPort,
	) {}

	/** Resolve permissions for the user identified by their auth subject (userId). */
	async resolve(userId: string): Promise<ResolvedPermissions> {
		const profile = await this.profileRepo.findProfileByUserId(userId);
		return this.resolveForProfile(profile);
	}

	/**
	 * Resolve permissions for an already-fetched profile record.
	 * Use this when the caller already holds the profile to avoid an extra DB lookup.
	 */
	async resolveForProfile(
		profile: ProfileRecord | null,
	): Promise<ResolvedPermissions> {
		if (!profile || profile.status !== 'active') {
			return { services: new Map(), functional: new Map() };
		}

		if (profile.role === 'owner') {
			return {
				services: new Map(
					SHIPPING_SERVICE_KEY_VALUES.map((key) => [
						key,
						{
							key,
							enabled: true,
							whitelistEnabled: false,
							recipientCount: null,
						},
					]),
				),
				functional: new Map(
					PERMISSION_KEY_VALUES.map((key) => [key, { key, allowed: true }]),
				),
			};
		}

		const [serviceRows, functionalRows] = await Promise.all([
			this.serviceRepo.findAllForProfile(profile.id),
			this.permissionsRepo.findAllForProfile(profile.id),
		]);

		return {
			services: new Map(
				serviceRows.map((r) => [
					r.key,
					{
						key: r.key,
						enabled: r.enabled,
						whitelistEnabled: r.whitelistEnabled,
						recipientCount: r.whitelistEnabled ? (r.recipientCount ?? 0) : null,
					},
				]),
			),
			functional: new Map(
				functionalRows.map((r) => [r.key, { key: r.key, allowed: r.allowed }]),
			),
		};
	}
}
