import { Injectable } from '@nestjs/common';
import { SystemNotFoundException } from '../../domain/exceptions/system-not-found.exception';
import type {
	ListSystemMembersCommand,
	ListSystemMembersResult,
} from '../ports/in/list-system-members.use-case.port';
import { ListSystemMembersUseCasePort } from '../ports/in/list-system-members.use-case.port';
import { SystemMembershipRepositoryPort } from '../ports/out/system-membership-repository.port';
import { SystemRepositoryPort } from '../ports/out/system-repository.port';

@Injectable()
export class ListSystemMembersUseCase implements ListSystemMembersUseCasePort {
	constructor(
		private readonly systemRepo: SystemRepositoryPort,
		private readonly membershipRepo: SystemMembershipRepositoryPort,
	) {}

	async execute(
		command: ListSystemMembersCommand,
	): Promise<ListSystemMembersResult> {
		const { systemId, pagination } = command;

		const system = await this.systemRepo.findById(systemId);
		if (!system) {
			return { success: false, error: new SystemNotFoundException() };
		}

		const data = await this.membershipRepo.findAllBySystem(
			systemId,
			pagination,
		);
		return { success: true, data };
	}
}
