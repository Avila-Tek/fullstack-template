import type { ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { GetUserByEmailQuery } from '../../../shared/user/GetUserByEmail';
import type {
	GetUserByEmailCommand,
	GetUserByEmailPort,
} from '../../application/ports/out/GetUserByEmail';
import { AuthUser } from '../../domain/entities/AuthUser';
import type { UserStatusEnum } from '../../domain/value-objects/Status';

export class GetUserByEmailAdapter
	implements ICommandHandler<GetUserByEmailPort>
{
	constructor(private readonly queryBus: QueryBus) {}

	async execute(command: GetUserByEmailCommand) {
		const result = await this.queryBus.execute(
			new GetUserByEmailQuery(command.email),
		);
		if (!result) return null;

		return AuthUser.restore({
			id: result.id,
			email: result.email,
			passwordHash: result.passwordHash,
			roleId: result.roleId,
			status: result.status as UserStatusEnum,
		});
	}
}
