import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { SystemNotFoundException } from '../../domain/exceptions/system-not-found.exception';
import {
	type GetSystemResult,
	GetSystemUseCasePort,
} from '../ports/in/get-system.use-case.port';
import { SystemRepositoryPort } from '../ports/out/system-repository.port';

@Injectable()
export class GetSystemUseCase implements GetSystemUseCasePort {
	constructor(
		private readonly systemRepo: SystemRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(systemId: string): Promise<GetSystemResult> {
		const system = await this.systemRepo.findById(systemId);

		if (!system) {
			this.logger.warn(
				{
					event: 'auth.system.get_error',
					systemId,
					errorCode: 'AUTH_SYSTEM_NOT_FOUND',
				},
				'System not found',
			);
			return {
				success: false,
				error: new SystemNotFoundException({ systemId }),
			};
		}

		return { success: true, data: system };
	}
}
