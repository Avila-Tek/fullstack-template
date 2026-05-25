import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
	type AddMemberParams,
	BetterAuthOrgPort,
	type CreateOrgResult,
	type RemoveMemberParams,
	type SessionWithUser,
	type UpdateMemberRoleParams,
} from '../../application/ports/out/better-auth-org.port';
import * as schema from '../database/db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../database/drizzle.module';
import { auth } from './auth';

// Wraps Better Auth organization table operations via Drizzle.
// We insert directly rather than calling auth.api.createOrganization so that
// no HTTP request or session token is required for server-side admin flows.
@Injectable()
export class BetterAuthOrgAdapter implements BetterAuthOrgPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async createOrganization(
		name: string,
		slug: string,
		createdByUserId: string,
	): Promise<CreateOrgResult> {
		const organizationId = crypto.randomUUID();

		await this.db.transaction(async (tx) => {
			await tx.insert(schema.organization).values({
				id: organizationId,
				name,
				slug,
			});

			// Add the platform admin as the owner member of the new org
			await tx.insert(schema.member).values({
				id: crypto.randomUUID(),
				organizationId,
				userId: createdByUserId,
				role: 'owner',
			});
		});

		return { organizationId };
	}

	async addMember(params: AddMemberParams): Promise<void> {
		await auth.api.addMember({
			body: {
				userId: params.userId,
				role: params.role,
				organizationId: params.organizationId,
			},
		});
	}

	async removeMember(params: RemoveMemberParams): Promise<void> {
		await auth.api.removeMember({
			body: {
				memberIdOrEmail: params.memberIdOrEmail,
				organizationId: params.organizationId,
			},
			headers: params.headers,
		});
	}

	async updateMemberRole(params: UpdateMemberRoleParams): Promise<void> {
		await auth.api.updateMemberRole({
			body: {
				memberId: params.memberId,
				role: params.role,
				organizationId: params.organizationId,
			},
			headers: params.headers,
		});
	}

	async findBaMemberByUserAndOrg(
		userId: string,
		organizationId: string,
	): Promise<string | null> {
		const [row] = await this.db
			.select({ id: schema.member.id })
			.from(schema.member)
			.where(
				and(
					eq(schema.member.userId, userId),
					eq(schema.member.organizationId, organizationId),
				),
			)
			.limit(1);

		return row?.id ?? null;
	}

	async getSession(headers: Headers): Promise<SessionWithUser | null> {
		const result = await auth.api.getSession({ headers });
		if (!result) return null;
		return {
			session: {
				id: result.session.id,
				userId: result.session.userId,
				createdAt: result.session.createdAt,
				activeOrganizationId: result.session.activeOrganizationId ?? null,
			},
			user: {
				id: result.user.id,
				email: result.user.email,
				emailVerified: result.user.emailVerified,
			},
		};
	}
}
