import { z } from 'zod';
import {
  goalPeriod,
  goalPeriodEnumObject,
  scheduleType,
  scheduleTypeEnumObject,
  timeOfDay,
} from './habit.model';

const goalPeriodSchema = z.enum(goalPeriod);
const scheduleTypeSchema = z.enum(scheduleType);
const timeOfDaySchema = z.enum(timeOfDay);

const timeHHmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const zTimeHHmmFormat = z
  .string()
  .regex(timeHHmmRegex, 'Formato inválido (HH:mm)')
  .optional();

const scheduleFormSchema = z.object({
  type: scheduleTypeSchema,
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  weeklyDay: z.number().min(0).max(6).optional(),
  weeklyFlexible: z.boolean().default(false),
});

const goalFormSchema = z.object({
  unit: z.string().min(1, 'La unidad es obligatoria'),
  period: goalPeriodSchema,
  target: z.coerce.number().int().positive('El objetivo debe ser mayor a 0'),
});

const reminderFormSchema = z
  .object({
    enabled: z.boolean(),
    time: zTimeHHmmFormat,
  })
  .refine((data) => !data.enabled || data.time, {
    message: 'Se requiere hora si el recordatorio está activo',
    path: ['time'],
  });

/** Single form schema for both create and update; transform to API types in onSubmit. */
export const createHabitFormSchema = z
  .object({
    name: z
      .string()
      .min(1, 'El nombre es obligatorio')
      .max(255, 'Máximo 255 caracteres'),
    description: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
    schedule: scheduleFormSchema,
    goal: goalFormSchema,
    timeOfDay: timeOfDaySchema,
    reminder: reminderFormSchema,
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) =>
      !data.endDate || !data.startDate || data.endDate >= data.startDate,
    {
      message: 'La fecha de fin debe ser posterior a la de inicio',
      path: ['endDate'],
    }
  );

export type TCreateHabitForm = z.infer<typeof createHabitFormSchema>;

export function createHabitDefaultValues(
  partial?: Partial<TCreateHabitForm>
): TCreateHabitForm {
  return {
    name: partial?.name ?? '',
    description: partial?.description ?? '',
    schedule: partial?.schedule ?? {
      type: scheduleTypeEnumObject.daily,
      weeklyFlexible: false,
    },
    goal: partial?.goal ?? {
      unit: 'días',
      period: goalPeriodEnumObject.day,
      target: 1,
    },
    timeOfDay: partial?.timeOfDay ?? 'morning',
    reminder: partial?.reminder ?? { enabled: false, time: undefined },
    startDate: partial?.startDate ?? undefined,
    endDate: partial?.endDate ?? undefined,
  };
}

export const logProgressFormSchema = z.object({
  value: z.coerce.number().int().min(1, 'El valor debe ser al menos 1'),
});

export type TLogProgressForm = z.infer<typeof logProgressFormSchema>;

export function logProgressDefaultValues(): TLogProgressForm {
  return {
    value: 1,
  };
}

/** Transform form data to update API input (one form schema, transform on submit). */
export function createHabitFormToUpdateInput(
  habitId: string,
  form: TCreateHabitForm
) {
  return {
    id: habitId,
    input: {
      name: form.name,
      description: form.description,
      schedule: form.schedule,
      goal: form.goal,
      timeOfDay: form.timeOfDay,
      reminder: form.reminder,
      startDate: form.startDate,
      endDate: form.endDate,
    },
  };
}
