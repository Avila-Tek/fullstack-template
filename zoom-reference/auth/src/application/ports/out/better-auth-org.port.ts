// Outbound port — Better Auth Organization plugin operations.
// Implemented by BetterAuthOrgAdapter in infrastructure/better-auth/.

export interface CreateOrgResult {
	organizationId: string;
}

// Session shape returned by BA's getSession — narrowed to the fields we use.
// activeOrganizationId is set by databaseHooks.session.create.before in auth.ts.
export interface SessionWithUser {
	session: {
		id: string;
		userId: string;
		createdAt: Date;
		activeOrganizationId: string | null;
	};
	user: {
		id: string;
		email: string;
		emailVerified: boolean;
	};
}

export interface AddMemberParams {
	userId: string;
	role: 'member' | 'admin';
	organizationId: string;
}

export interface RemoveMemberParams {
	memberIdOrEmail: string;
	organizationId: string;
	headers: Headers;
}

export interface UpdateMemberRoleParams {
	memberId: string;
	role: 'member' | 'admin';
	organizationId: string;
	headers: Headers;
}

export abstract class BetterAuthOrgPort {
	abstract createOrganization(
		name: string,
		slug: string,
		createdByUserId: string,
	): Promise<CreateOrgResult>;

	abstract getSession(headers: Headers): Promise<SessionWithUser | null>;

	abstract addMember(params: AddMemberParams): Promise<void>;

	abstract removeMember(params: RemoveMemberParams): Promise<void>;

	abstract updateMemberRole(params: UpdateMemberRoleParams): Promise<void>;

	// Returns the BA member.id for a given userId + organizationId, or null.
	abstract findBaMemberByUserAndOrg(
		userId: string,
		organizationId: string,
	): Promise<string | null>;
}
