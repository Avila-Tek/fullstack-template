'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/ui/components/button';
import { DialogFooter } from '@repo/ui/components/dialog';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { FormProvider, type Resolver, useForm } from 'react-hook-form';
import {
  formTypeEnumObject,
  type TFormType,
} from '@/src/shared/constants/formType';
import { useUpdateHabitMutation } from '../../application/mutations/useUpdateHabit.mutation';
import { useCreateHabitFlow } from '../../application/useCases/createHabitFlow.useCase';
import { HABIT_SUBMIT_LABELS } from '../../domain/habit.constants';
import type { HabitWithProgress } from '../../domain/habit.model';
import {
  createHabitDefaultValues,
  createHabitFormSchema,
  createHabitFormToUpdateInput,
  type TCreateHabitForm,
} from '../../domain/habits.form';
import {
  createHabitFormToInput,
  habitToFormPartial,
} from '../../infrastructure/habits.transform';
import { PlanLimitModal } from '../components/PlanLimitModal';
import { HabitFormContent } from './HabitFormContent';

interface HabitModalFormContentProps {
  formType: TFormType;
  habit: HabitWithProgress | null;
  onClose: () => void;
}

export function HabitModalFormContent({
  formType,
  habit,
  onClose,
}: HabitModalFormContentProps) {
  const createFlow = useCreateHabitFlow();
  const updateMutation = useUpdateHabitMutation();

  const defaultValues = createHabitDefaultValues(
    habit ? habitToFormPartial(habit) : undefined
  );

  const methods = useForm<TCreateHabitForm>({
    defaultValues,
    resolver: zodResolver(createHabitFormSchema) as Resolver<TCreateHabitForm>,
  });

  React.useEffect(() => {
    if (
      habit &&
      (formType === formTypeEnumObject.edit ||
        formType === formTypeEnumObject.view)
    ) {
      methods.reset(createHabitDefaultValues(habitToFormPartial(habit)));
    }
  }, [habit?.id, formType, habit, methods.reset]);

  const isView = formType === formTypeEnumObject.view;
  const isPending = createFlow.isPending || updateMutation.isPending;

  async function onSubmit(data: TCreateHabitForm) {
    if (formType === formTypeEnumObject.create) {
      const success = await createFlow.createHabit(
        createHabitFormToInput(data)
      );
      if (success) {
        methods.reset(createHabitDefaultValues());
        onClose();
      }
      return;
    }

    if (formType === formTypeEnumObject.view) {
      onClose();
      return;
    }

    if (formType === formTypeEnumObject.edit && habit) {
      try {
        await updateMutation.mutateAsync(
          createHabitFormToUpdateInput(habit.id, data)
        );
        onClose();
      } catch {
        // Error handling is done by mutation
      }
    }
  }

  function handleClose() {
    methods.reset(createHabitDefaultValues());
    onClose();
  }

  const submitLabel = HABIT_SUBMIT_LABELS[formType];

  return (
    <React.Fragment>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
          <HabitFormContent disabled={isView || isPending} />

          <DialogFooter className="gap-2 border-t border-gray-light-mode-200 pt-6 mt-6">
            {isView ? (
              <Button type="button" onClick={handleClose}>
                {HABIT_SUBMIT_LABELS[formTypeEnumObject.view]}
              </Button>
            ) : (
              <React.Fragment>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="border-gray-light-mode-300 text-gray-light-mode-700 hover:bg-gray-light-mode-50"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-brand-solid text-base-white hover:bg-brand-solid_hover"
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {submitLabel}
                </Button>
              </React.Fragment>
            )}
          </DialogFooter>
        </form>
      </FormProvider>
      <PlanLimitModal
        open={createFlow.planLimitModalOpen}
        onOpenChange={createFlow.setPlanLimitModalOpen}
      />
    </React.Fragment>
  );
}
