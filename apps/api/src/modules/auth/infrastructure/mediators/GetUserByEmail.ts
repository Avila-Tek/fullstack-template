import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { GetUserByEmailQuery } from '../../../shared/user/GetUserByEmail';
import {
  GetUserByEmailPort,
} from '../../application/ports/out/GetUserByEmail';
import { AuthUser } from '../../domain/entities/AuthUser';
import { UserStatusEnum } from '../../domain/value-objects/UserStatus';

@CommandHandler(GetUserByEmailPort)
export class GetUserByEmailAdapter
  implements ICommandHandler<GetUserByEmailPort>
{
  constructor(private readonly queryBus: QueryBus) {}

  async execute(command: GetUserByEmailPort) {
    const result = await this.queryBus.execute(
      new GetUserByEmailQuery(command.email)
    );
    if (!result) return null;

    return AuthUser.restore({
      id: result.id,
      email: result.email,
      passwordHash: result.passwordHash,
      status: result.status as UserStatusEnum,
    });
  }
}
