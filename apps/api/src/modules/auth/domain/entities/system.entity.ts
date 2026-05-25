// System aggregate — represents a consuming application registered with the IdP.
// Immutable: use SystemRepositoryPort.update / setStatus for mutations.

export type SystemStatus = 'active' | 'suspended';
export type SystemAccessModel = 'open' | 'restricted';

export interface SystemProps {
	id: string;
	name: string;
	slug: string;
	apiBaseUrl: string;
	accessModel: SystemAccessModel;
	organizationId: string;
	status: SystemStatus;
	isDeleted: boolean;
	deletedByUserId: string | null;
	deletedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export class System {
	readonly id: string;
	readonly name: string;
	readonly slug: string;
	readonly apiBaseUrl: string;
	readonly accessModel: SystemAccessModel;
	readonly organizationId: string;
	readonly status: SystemStatus;
	readonly isDeleted: boolean;
	readonly deletedByUserId: string | null;
	readonly deletedAt: Date | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;

	private constructor(props: SystemProps) {
		this.id = props.id;
		this.name = props.name;
		this.slug = props.slug;
		this.apiBaseUrl = props.apiBaseUrl;
		this.accessModel = props.accessModel;
		this.organizationId = props.organizationId;
		this.status = props.status;
		this.isDeleted = props.isDeleted;
		this.deletedByUserId = props.deletedByUserId;
		this.deletedAt = props.deletedAt;
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
	}

	static reconstitute(props: SystemProps): System {
		return new System(props);
	}
}
