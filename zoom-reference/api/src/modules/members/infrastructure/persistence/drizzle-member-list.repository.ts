import { Inject, Injectable } from '@nestjs/common';
import type { TCollaboratorListItem, TListMembersQuery } from '@zoom/schemas';
import { and, asc, count, eq, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { businessAccountInvite } from '../../../invitations/infrastructure/persistence/business-account-invite.schema';
import { businessProfile } from '../../../profiles/infrastructure/persistence/business-profile.schema';
import type {
	MemberListPage,
	MemberListRepositoryPort,
} from '../../application/ports/out/member-list-repository.port';

function resolveName(r: {
	legalName: string | null;
	email: string | null;
}): string {
	return r.legalName || r.email || '';
}

function buildSearchCondition(term: string) {
	const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
	return or(
		sql`${businessProfile.legalName} ILIKE ${pattern} ESCAPE '\\'`,
		sql`${businessProfile.email} ILIKE ${pattern} ESCAPE '\\'`,
	);
}

@Injectable()
export class DrizzleMemberListRepository implements MemberListRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findPage(
		businessAccountId: string,
		query: TListMembersQuery,
	): Promise<MemberListPage> {
		// Ensure page is positive to avoid negative offset
		const page = Math.max(1, query.page);
		const offset = (page - 1) * query.limit;

		const baseWhere = and(
			eq(businessProfile.businessAccountId, businessAccountId),
			eq(businessProfile.isDeleted, false),
			eq(businessProfile.role, 'member'),
		);

		const statusCondition = query.status
			? eq(businessProfile.status, query.status)
			: undefined;

		const searchCondition = query.search
			? buildSearchCondition(query.search)
			: undefined;

		const where = and(baseWhere, statusCondition, searchCondition);

		const [rows, countRows] = await Promise.all([
			this.db
				.select({
					id: businessProfile.id,
					legalName: businessProfile.legalName,
					email: businessProfile.email,
					role: businessProfile.role,
					status: businessProfile.status,
					roleTemplateId: businessProfile.roleTemplateId,
					inviteId: businessAccountInvite.id,
				})
				.from(businessProfile)
				.leftJoin(
					businessAccountInvite,
					and(
						eq(businessAccountInvite.businessProfileId, businessProfile.id),
						eq(businessAccountInvite.status, 'pending'),
					),
				)
				.where(where)
				.orderBy(asc(businessProfile.createdAt), asc(businessProfile.id))
				.limit(query.limit)
				.offset(offset),
			this.db.select({ count: count() }).from(businessProfile).where(where),
		]);

		const total = countRows[0]?.count ?? 0;

		const items: TCollaboratorListItem[] = rows.map((r) => ({
			businessProfileId: r.id,
			inviteId: r.inviteId ?? null,
			name: resolveName(r),
			email: r.email,
			role: r.role,
			status: r.status,
			roleTemplateId: r.roleTemplateId,
		}));

		return { items, total };
	}
}
