import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import {
	type ListSystemsResult,
	ListSystemsUseCasePort,
} from '../ports/in/list-systems.use-case.port';
import { SystemRepositoryPort } from '../ports/out/system-repository.port';

@Injectable()
export class ListSystemsUseCase implements ListSystemsUseCasePort {
	constructor(
		private readonly systemRepo: SystemRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(): Promise<ListSystemsResult> {
		const systems = await this.systemRepo.findAll();

		this.logger.info(
			{ event: 'auth.system.list', count: systems.length },
			'Systems listed',
		);

		return { success: true, data: systems };
	}
}
