import type { TPagination, TPaginationInput } from '@zoom/schemas';
import type { SystemMembershipEntity } from '../../../domain/entities/system-membership.entity';

// Outbound port — membership lookup and upsert for access-model enforcement.
// Implemented by DrizzleSystemMembershipRepository in infrastructure/database/repositories/.

export interface UpsertMemberParams {
	userId: string;
	systemId: string;
	organizationId: string;
	role: 'member' | 'admin' | 'owner';
}

export interface MemberRow {
	userId: string;
	email: string;
	role: 'member' | 'admin' | 'owner';
	activated: boolean;
	createdAt: Date;
}

export interface InsertMembershipParams {
	userId: string;
	systemId: string;
	organizationId: string;
	role: 'member' | 'admin';
}

export abstract class SystemMembershipRepositoryPort {
	// Returns the active (non-deleted) membership for a user/org pair, or null.
	abstract findByUserAndOrg(
		userId: string,
		organizationId: string,
	): Promise<SystemMembershipEntity | null>;

	// Idempotent insert-or-update: inserts a new active membership if none exists;
	// updates role on an existing non-deleted row. Safe to call multiple times.
	abstract upsertMember(params: UpsertMemberParams): Promise<void>;

	// Paginated member list for a system — JOINs user to include email + activated.
	abstract findAllBySystem(
		systemId: string,
		pagination: TPaginationInput,
	): Promise<TPagination<MemberRow>>;

	// Inserts a new active membership row.
	abstract insertMembership(
		params: InsertMembershipParams,
	): Promise<SystemMembershipEntity>;

	// Soft-delete — returns null if no active membership found.
	abstract softDeleteByUser(
		userId: string,
		systemId: string,
	): Promise<SystemMembershipEntity | null>;

	// Role update — returns null if no active membership found.
	abstract updateMemberRole(
		userId: string,
		systemId: string,
		role: 'member' | 'admin',
	): Promise<SystemMembershipEntity | null>;
}
