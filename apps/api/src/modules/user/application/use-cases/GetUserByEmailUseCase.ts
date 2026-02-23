import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../ports/out/UserRepository';
import type { GetUserByEmailPort } from '../ports/in/GetUserByEmailPort';

@Injectable()
export class GetUserByEmailUseCase implements GetUserByEmailPort {
	constructor(
		@Inject(UserRepository)
		private readonly userRepository: UserRepository
	) {}

	async execute(email: string) {
		const user = await this.userRepository.findByEmailWithCredentials(email);
		if (!user) return null;
		return user;
	}
}
