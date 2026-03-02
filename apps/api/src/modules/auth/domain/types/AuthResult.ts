export interface AuthResult {
	user: {
		id: string;
		email: string;
		firstName: string | null;
		lastName: string | null;
		timezone?: string;
		status: 'active' | 'inactive';
		createdAt: string | null | undefined;
		updatedAt: string | null | undefined;
	};
	accessToken: string;
	refreshToken: string;
}
