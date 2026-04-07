import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@/shared/domain-utils';

@Injectable()
export class DomainToHttpMapper {
	constructor(
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	private static readonly STATUS: Record<string, number> = {
		REGION_COUNTRY_NOT_FOUND: 404,
	};

	map(errorCode: string): number {
		const status = DomainToHttpMapper.STATUS[errorCode];
		if (status === undefined) {
			this.logger.warn(
				{ event: 'http.mapper.unmapped_error', errorCode },
				`Unmapped domain error code "${errorCode}" — defaulting to 500`,
			);
			return 500;
		}
		return status;
	}
}
