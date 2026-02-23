'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import {
  formTypeEnumObject,
  type TFormType,
} from '@/src/shared/constants/formType';
import { HABIT_MODAL_TITLES } from '../../domain/habit.constants';
import type { HabitWithProgress } from '../../domain/habit.model';
import { HabitModalFormContent } from './HabitModalFormContent';

interface HabitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formType: TFormType;
  /** Required when formType is edit or view. */
  habit?: HabitWithProgress | null;
}

export function HabitModal({
  open,
  onOpenChange,
  formType,
  habit = null,
}: HabitModalProps) {
  function handleOpenChange(next: boolean) {
    if (!next) onOpenChange(false);
  }

  const formKey =
    formType === formTypeEnumObject.create ? 'create' : (habit?.id ?? 'closed');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden border-gray-light-mode-200 bg-base-white shadow-xl sm:max-w-[540px] rounded-2xl p-0 gap-0">
        <DialogHeader className="shrink-0 border-b border-gray-light-mode-200 px-6 pr-12 py-4">
          <DialogTitle className="text-gray-light-mode-900 text-xl font-semibold">
            {HABIT_MODAL_TITLES[formType]}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <HabitModalFormContent
            key={formKey}
            formType={formType}
            habit={habit ?? null}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
