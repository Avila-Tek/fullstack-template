import type {
	TRoleTemplateDetailOutput,
	TRoleTemplatesListOutput,
} from '@zoom/schemas';

export abstract class RoleTemplateRepositoryPort {
	/** Returns all non-deleted role templates (id, key, name, description). */
	abstract findAll(): Promise<TRoleTemplatesListOutput>;

	/** Returns template with services and permissions. Null if not found or deleted. */
	abstract findById(id: string): Promise<TRoleTemplateDetailOutput | null>;
}
