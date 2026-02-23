import { Injectable } from '@nestjs/common';
import type {
	TokenGenerator,
	TokenPayload,
} from '../../application/ports/out/TokenGenerator';

@Injectable()
export class JwtTokenGenerator implements TokenGenerator {
	constructor() {}

	async generate(payload: TokenPayload): Promise<string> {
		return new Promise((resolve) => {
			const token = JSON.stringify(payload);
			resolve(token);
		});
	}
}
