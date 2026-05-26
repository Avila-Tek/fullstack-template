import { Injectable } from '@nestjs/common';
import type { TListRecipientsResponse } from '@zoom/schemas';
import { RecipientProfileNotFoundException } from '../../domain/exceptions/recipient-profile-not-found.exception';
import type {
	ListRecipientsCommand,
	ListRecipientsUseCasePort,
} from '../ports/in/list-recipients.use-case.port';
import { BusinessProfileLookupPort } from '../ports/out/business-profile-lookup.port';
import { BusinessProfileReaderPort } from '../ports/out/business-profile-reader.port';
import { RecipientRepositoryPort } from '../ports/out/recipient-repository.port';

@Injectable()
export class ListRecipientsUseCase implements ListRecipientsUseCasePort {
	constructor(
		private readonly recipientRepo: RecipientRepositoryPort,
		private readonly profileRepo: BusinessProfileLookupPort,
		private readonly profileReader: BusinessProfileReaderPort,
	) {}

	async execute(cmd: ListRecipientsCommand): Promise<TListRecipientsResponse> {
		const profile = await this.profileRepo.findProfileByUserId(cmd.userId);
		if (!profile) {
			throw new RecipientProfileNotFoundException({ userId: cmd.userId });
		}

		const { items, total } = await this.recipientRepo.findPaginated({
			businessAccountId: profile.businessAccountId,
			callerProfileId: profile.id,
			callerRole: profile.role,
			hasShareGuide: cmd.permissions.hasShareGuide,
			hasShareLocker: cmd.permissions.hasShareLocker,
			recipientType: cmd.query.recipientType,
			serviceScope: cmd.query.serviceScope,
			status: cmd.query.status,
			starred: cmd.query.starred,
			search: cmd.query.search,
			page: cmd.query.page,
			limit: cmd.query.limit,
		});

		if (items.length === 0) {
			return {
				items: [],
				total,
				page: cmd.query.page,
				limit: cmd.query.limit,
			};
		}

		const uniqueProfileIds = [
			...new Set(
				items
					.map((r) => r.ownerBusinessProfileId)
					.filter((id): id is string => id !== null),
			),
		];
		const nameMap = await this.profileReader.findNamesByIds(uniqueProfileIds);

		return {
			items: items.map((row) => ({
				id: row.id,
				alias: row.alias,
				name: row.name,
				recipientType: row.recipientType,
				serviceScope: row.serviceScope,
				status: row.status,
				starred: row.starred,
				stateName: row.stateName,
				cityName: row.cityName,
				formattedAddress: row.formattedAddress ?? null,
				internationalCityText: row.internationalCityText ?? null,
				countryName: row.countryName ?? null,
				lockerPrefix: row.lockerPrefix,
				lockerCode: row.lockerCode,
				ownerBusinessProfileId: row.ownerBusinessProfileId ?? '',
				ownerName: row.ownerBusinessProfileId
					? (nameMap.get(row.ownerBusinessProfileId) ?? null)
					: null,
				isBusinessAccountOwner: row.isBusinessAccountOwner,
				createdAt: row.createdAt.toISOString(),
			})),
			total,
			page: cmd.query.page,
			limit: cmd.query.limit,
		};
	}
}
