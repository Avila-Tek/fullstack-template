import { z } from 'zod';
import { createUserInput } from '../users';
import { userSchema } from '../users/user.schema';

// Sign In Input
const signInInput = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const signInResponse = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.object({ user: userSchema, token: z.string() }),
  }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type TSignInInput = z.infer<typeof signInInput>;
export type TSignInResponse = z.infer<typeof signInResponse>;

// JWT User Payload
const jwtUserPayload = z.object({
  _id: z.string(),
});

export type JwtUserPayload = z.infer<typeof jwtUserPayload>;

// Sign Up Input
const signUpInput = createUserInput.extend({
  rePassword: z.string().min(8),
});

const signUpResponse = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.object({ user: userSchema, token: z.string() }),
  }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type TSignUpInput = z.infer<typeof signUpInput>;
export type TSignUpResponse = z.infer<typeof signUpResponse>;

export const authDTO = Object.freeze({
  // Sign In
  signInInput,
  signInResponse,
  jwtUserPayload,
  // Sign Up
  signUpInput,
  signUpResponse,
});
