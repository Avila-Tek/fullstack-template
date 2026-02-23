import { Query } from '@nestjs/cqrs';

export class GetUserByEmailQuery extends Query<GetUserByEmailDTO | null> {
	constructor(public readonly email: string) {
		super();
	}
}

export interface GetUserByEmailDTO {
	id: string;
	email: string;
	passwordHash: string;
	status: string;
	roleId: string;
}
