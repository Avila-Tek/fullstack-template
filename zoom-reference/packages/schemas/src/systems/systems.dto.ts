import { z } from 'zod';

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export const grantSystemAccessBody = z.object({
  email: z.string().email().describe('Email of the user to grant access to'),
  role: z
    .enum(['member', 'admin'])
    .optional()
    .describe('Role to assign — defaults to member'),
});

export type TGrantSystemAccessBody = z.infer<typeof grantSystemAccessBody>;

export const updateMemberRoleBody = z.object({
  role: z.enum(['member', 'admin']).describe('New role to assign'),
});

export type TUpdateMemberRoleBody = z.infer<typeof updateMemberRoleBody>;

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export const grantSystemAccessResponse = z.object({
  path: z
    .enum(['existing', 'provisioned'])
    .describe(
      'existing — user already had an account; provisioned — new account created'
    ),
  alreadyMember: z
    .literal(true)
    .optional()
    .describe('Present when the user was already a member — no changes made'),
  userId: z.string().describe('Better Auth user ID'),
  role: z.enum(['member', 'admin', 'owner']),
  profileId: z.string().describe('Local system membership ID'),
});

export type TGrantSystemAccessResponse = z.infer<
  typeof grantSystemAccessResponse
>;

export const systemMemberItem = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: z.enum(['member', 'admin', 'owner']),
  activated: z.boolean().describe('Whether the user has completed onboarding'),
  createdAt: z.iso.datetime().describe('ISO 8601 timestamp'),
});

export type TSystemMemberItem = z.infer<typeof systemMemberItem>;
