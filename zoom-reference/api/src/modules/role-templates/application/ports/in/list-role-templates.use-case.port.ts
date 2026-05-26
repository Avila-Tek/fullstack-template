import type { TRoleTemplatesListOutput } from '@zoom/schemas';

export abstract class ListRoleTemplatesUseCasePort {
	abstract execute(): Promise<TRoleTemplatesListOutput>;
}
