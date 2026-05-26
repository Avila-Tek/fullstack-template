import type { Result } from '@zoom/utils';
import type { System } from '../../../domain/entities/system.entity';

export type ListSystemsResult = Result<System[], never>;

export abstract class ListSystemsUseCasePort {
	abstract execute(): Promise<ListSystemsResult>;
}
