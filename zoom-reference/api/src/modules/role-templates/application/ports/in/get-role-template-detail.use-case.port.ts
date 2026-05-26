import type { TRoleTemplateDetailOutput } from '@zoom/schemas';

export abstract class GetRoleTemplateDetailUseCasePort {
	abstract execute(id: string): Promise<TRoleTemplateDetailOutput | null>;
}
