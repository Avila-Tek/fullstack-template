import { z } from 'zod';

// Shared schemas
export const planLimitsSchema = z.object({
  habitsMax: z.number().int().nullable(),
  reportsEnabled: z.boolean(),
  historyDays: z.number().int().nullable(),
  remindersEnabled: z.boolean(),
});

const planPriceSchema = z.object({
  id: z.string().uuid(),
  currency: z.string(),
  interval: z.string(),
  amountCents: z.number().int(),
  trialDays: z.number().int(),
  isActive: z.boolean(),
});

const planCatalogItemSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  isFree: z.boolean(),
  displayOrder: z.number().int(),
  limits: planLimitsSchema,
  prices: z.array(planPriceSchema),
});

// Public endpoints
const listPlansCatalogResponse = z.object({
  plans: z.array(planCatalogItemSchema),
});

// Admin - Plan endpoints
const createPlanInput = z.object({
  key: z.string().min(1, 'key is required'),
  name: z.string().min(1, 'name is required'),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  isFree: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  limitsHabitsMax: z.number().int().nullable().optional(),
  limitsReportsEnabled: z.boolean().optional(),
  limitsHistoryDays: z.number().int().nullable().optional(),
  limitsRemindersEnabled: z.boolean().optional(),
});

const updatePlanInput = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  isFree: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  limitsHabitsMax: z.number().int().nullable().optional(),
  limitsReportsEnabled: z.boolean().optional(),
  limitsHistoryDays: z.number().int().nullable().optional(),
  limitsRemindersEnabled: z.boolean().optional(),
});

const planIdParams = z.object({
  planId: z.string().uuid(),
});

const planResponse = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  isFree: z.boolean(),
  displayOrder: z.number().int(),
  limitsHabitsMax: z.number().int().nullable(),
  limitsReportsEnabled: z.boolean(),
  limitsHistoryDays: z.number().int().nullable(),
  limitsRemindersEnabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Admin - Plan Price endpoints
const createPlanPriceInput = z.object({
  currency: z.string().optional(),
  interval: z.string().min(1, 'interval is required'),
  amountCents: z.number().int().min(0, 'amountCents must be >= 0'),
  trialDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updatePlanPriceInput = z.object({
  currency: z.string().optional(),
  interval: z.string().optional(),
  amountCents: z.number().int().min(0).optional(),
  trialDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const planPriceIdParams = z.object({
  planPriceId: z.string().uuid(),
});

const planPriceResponse = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  currency: z.string(),
  interval: z.string(),
  amountCents: z.number().int(),
  trialDays: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Get plan by ID response
const getPlanByIdResponse = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: planCatalogItemSchema,
  }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

// Type exports
export type TPlanLimits = z.infer<typeof planLimitsSchema>;
export type TPlanPrice = z.infer<typeof planPriceSchema>;
export type TPlanCatalogItem = z.infer<typeof planCatalogItemSchema>;
export type TListPlansCatalogResponse = z.infer<
  typeof listPlansCatalogResponse
>;
export type TGetPlanByIdResponse = z.infer<typeof getPlanByIdResponse>;
export type TCreatePlanInput = z.infer<typeof createPlanInput>;
export type TUpdatePlanInput = z.infer<typeof updatePlanInput>;
export type TPlanIdParams = z.infer<typeof planIdParams>;
export type TPlanResponse = z.infer<typeof planResponse>;
export type TCreatePlanPriceInput = z.infer<typeof createPlanPriceInput>;
export type TUpdatePlanPriceInput = z.infer<typeof updatePlanPriceInput>;
export type TPlanPriceIdParams = z.infer<typeof planPriceIdParams>;
export type TPlanPriceResponse = z.infer<typeof planPriceResponse>;

export const planDTO = Object.freeze({
  planLimitsSchema,
  planPriceSchema,
  planCatalogItemSchema,
  listPlansCatalogResponse,
  getPlanByIdResponse,
  createPlanInput,
  updatePlanInput,
  planIdParams,
  planResponse,
  createPlanPriceInput,
  updatePlanPriceInput,
  planPriceIdParams,
  planPriceResponse,
});
