// SystemMembership value object — tracks a user's membership in a system/organization.
export interface SystemMembershipEntity {
	id: string;
	systemId: string;
	// Better Auth organization ID (text PK — not a UUID)
	organizationId: string;
	// Better Auth user ID (text PK — not a UUID)
	userId: string;
	role: 'member' | 'admin' | 'owner';
	status: 'active' | 'suspended';
	isDeleted: boolean;
}
