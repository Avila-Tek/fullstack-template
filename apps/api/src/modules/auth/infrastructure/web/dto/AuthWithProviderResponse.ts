import { z } from 'zod';

export const authWithProviderResponseSchema = z.object({
	success: z.literal(true),
	data: z.object({
		user: z.object({
			id: z.string(),
			email: z.string(),
			firstName: z.string().nullable(),
			lastName: z.string().nullable(),
			timezone: z.string().optional(),
			status: z.enum(['active', 'inactive']),
			createdAt: z.string().nullable().optional(),
			updatedAt: z.string().nullable().optional(),
		}),
		accessToken: z.string(),
		refreshToken: z.string(),
	}),
});

export type TAuthWithProviderResponse = z.infer<
	typeof authWithProviderResponseSchema
>;
