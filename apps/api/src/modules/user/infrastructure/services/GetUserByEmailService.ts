import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserByEmailQuery } from '../../../shared/user/GetUserByEmail';
import { GetUserByEmailPort } from '../../application/ports/in/GetUserByEmailPort';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailService
  implements IQueryHandler<GetUserByEmailQuery>
{
  constructor(
    @Inject(GetUserByEmailPort)
    private readonly getUserByEmail: GetUserByEmailPort
  ) {}

  async execute(query: GetUserByEmailQuery) {
    const user = await this.getUserByEmail.execute(query.email);

    if (!user) return null;

    if (!user.passwordHash) throw new Error('User has no password hash');

    return {
      id: user.id.value,
      email: user.email.value,
      passwordHash: user.passwordHash,
      status: user.status.getValue(),
    };
  }
}
