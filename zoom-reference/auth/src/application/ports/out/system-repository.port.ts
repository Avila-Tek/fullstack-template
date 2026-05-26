// Outbound port — system + system_api_key persistence.
// Implemented by DrizzleSystemRepository in infrastructure/database/.

import type {
	System,
	SystemAccessModel,
} from '../../../domain/entities/system.entity';
import type { SystemApiKey } from '../../../domain/entities/system-api-key.entity';

export interface CreateSystemData {
	id: string;
	name: string;
	slug: string;
	apiBaseUrl: string;
	accessModel: SystemAccessModel;
	organizationId: string;
}

export interface CreateApiKeyData {
	id: string;
	systemId: string;
	keyHash: string;
	keyPrefix: string;
}

export interface UpdateSystemData {
	name?: string;
	slug?: string;
	apiBaseUrl?: string;
	accessModel?: SystemAccessModel;
}

export abstract class SystemRepositoryPort {
	abstract findById(id: string): Promise<System | null>;
	abstract findBySlug(slug: string): Promise<System | null>;
	abstract findByName(name: string): Promise<System | null>;
	abstract findAll(): Promise<System[]>;
	abstract create(data: CreateSystemData): Promise<System>;
	/** Returns null when the system row no longer exists at commit time (TOCTOU). */
	abstract update(
		systemId: string,
		data: UpdateSystemData,
	): Promise<System | null>;
	abstract deactivate(systemId: string, deletedByUserId: string): Promise<void>;
	abstract createApiKey(data: CreateApiKeyData): Promise<SystemApiKey>;
	abstract findActiveApiKey(systemId: string): Promise<SystemApiKey | null>;
	/** Atomically revokes the existing active key and inserts the new one. */
	abstract rotateApiKey(
		systemId: string,
		newKeyData: CreateApiKeyData,
	): Promise<SystemApiKey>;
}
