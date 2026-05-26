import type { Result } from '@zoom/utils';
import type { System } from '../../../domain/entities/system.entity';
import type { SystemNotFoundException } from '../../../domain/exceptions/system-not-found.exception';

export type GetSystemResult = Result<System, SystemNotFoundException>;

export abstract class GetSystemUseCasePort {
	abstract execute(systemId: string): Promise<GetSystemResult>;
}
