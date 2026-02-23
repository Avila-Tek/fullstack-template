import { Badge } from '@repo/ui/components/badge';
import { HABIT_STATUS_LABELS } from '../../domain/habit.constants';
import {
  habitStatusEnumObject,
  type THabitStatus,
} from '../../domain/habit.model';

interface HabitStatusBadgeProps {
  status: THabitStatus;
}

const statusVariantMap: Record<
  THabitStatus,
  'secondary' | 'destructive' | null
> = {
  active: null,
  paused: 'secondary',
  blocked: 'destructive',
};

const statusClassNameMap: Record<THabitStatus, string> = {
  active: '',
  paused: 'bg-warning-100 text-warning-700',
  blocked: 'bg-error-100 text-error-600',
};

export function HabitStatusBadge({ status }: HabitStatusBadgeProps) {
  if (status === habitStatusEnumObject.active) return null;

  const variant = statusVariantMap[status];
  const customClassName = statusClassNameMap[status];

  return (
    <Badge variant={variant ?? 'default'} className={customClassName}>
      {HABIT_STATUS_LABELS[status]}
    </Badge>
  );
}
