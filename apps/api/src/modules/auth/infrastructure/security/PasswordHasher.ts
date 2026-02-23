import type { PasswordHasher } from '../../application/ports/out/PasswordHasher';

export class PasswordHasherAdapter implements PasswordHasher {
	async hash(password: string) {
		return new Promise<string>((resolve) => {
			setTimeout(() => {
				const hash = `hashed_${password}`;
				resolve(hash);
			}, 100);
		});
	}

	async verify(password: string, hash: string) {
		return new Promise<boolean>((resolve) => {
			setTimeout(() => {
				const expectedHash = `hashed_${password}`;
				resolve(hash === expectedHash);
			}, 100);
		});
	}
}
