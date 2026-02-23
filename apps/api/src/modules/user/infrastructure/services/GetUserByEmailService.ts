import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserByEmailQuery } from 'src/modules/shared/user/GetUserByEmail';
import { GetUserByEmailPort } from '../../application/ports/in/GetUserByEmailPort';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailService implements IQueryHandler<GetUserByEmailQuery> {
  constructor(private readonly getUserByEmail: GetUserByEmailPort) {}

  async execute(query: GetUserByEmailQuery) {
    const user = await this.getUserByEmail.execute(query.email);

    if (!user) return null;

    return {
      id: user.id.value,
      email: user.email.value,
      passwordHash: user.password!,
      status: user.status,
      roleId: '',
    };
  }
}
