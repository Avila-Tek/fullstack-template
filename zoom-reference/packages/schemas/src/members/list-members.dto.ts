import { getEnumObjectFromArray } from '@zoom/utils';
import { z } from 'zod';
import { buildPaginationSchemaForModel, type TPagination } from '../pagination';

// --- Enums ---

const COLLABORATOR_STATUS_VALUES = ['active', 'invited', 'suspended'] as const;
export const collaboratorStatusEnum = getEnumObjectFromArray(
  COLLABORATOR_STATUS_VALUES
);

export const collaboratorStatusFilter = z.enum(collaboratorStatusEnum);
export type TCollaboratorStatusFilter = z.infer<
  typeof collaboratorStatusFilter
>;

const BUSINESS_PROFILE_ROLE_VALUES = ['owner', 'member'] as const;
export const businessProfileRoleEnum = getEnumObjectFromArray(
  BUSINESS_PROFILE_ROLE_VALUES
);

export const businessProfileRoleFilter = z.enum(businessProfileRoleEnum);
export type TBusinessProfileRole = z.infer<typeof businessProfileRoleFilter>;

// --- Query ---

export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  status: collaboratorStatusFilter.optional(),
});
export type TListMembersQuery = z.infer<typeof listMembersQuerySchema>;

// --- Response item ---

export const collaboratorListItemSchema = z.object({
  businessProfileId: z.string().uuid(),
  inviteId: z.string().uuid().nullable(),
  name: z.string(),
  email: z.string().nullable(),
  role: businessProfileRoleFilter,
  status: collaboratorStatusFilter,
  roleTemplateId: z.string().uuid().nullable(),
});
export type TCollaboratorListItem = z.infer<typeof collaboratorListItemSchema>;

// --- Response envelope ---

export const listMembersOutputSchema = buildPaginationSchemaForModel(
  collaboratorListItemSchema
);
export type TListMembersOutput = TPagination<TCollaboratorListItem>;
