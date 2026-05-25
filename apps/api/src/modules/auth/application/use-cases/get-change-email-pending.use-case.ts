import { Inject, Injectable } from '@nestjs/common';
import type { TChangeEmailPendingResponse } from '@zoom/schemas';
import { GetChangeEmailPendingUseCasePort } from '../ports/in/get-change-email-pending.use-case.port';
import { ChangeEmailPendingPort } from '../ports/out/change-email-pending.port';

@Injectable()
export class GetChangeEmailPendingUseCase extends GetChangeEmailPendingUseCasePort {
	constructor(
		@Inject(ChangeEmailPendingPort)
		private readonly pendingPort: ChangeEmailPendingPort,
	) {
		super();
	}

	async execute(userId: string): Promise<TChangeEmailPendingResponse> {
		const pending = await this.pendingPort.get(userId);
		if (!pending) {
			return { hasPending: false };
		}
		return { hasPending: true, newEmail: pending.newEmail };
	}
}
