'use client';

import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdownMenu';
import {
  Ban,
  CheckCircle,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
} from 'lucide-react';
import React from 'react';
import {
  habitStatusEnumObject,
  type THabitStatus,
} from '../../domain/habit.model';

interface HabitActionsMenuProps {
  status: THabitStatus;
  isCompleted: boolean;
  onEdit: () => void;
  onPause: () => void;
  onReactivate: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onMarkComplete: () => void;
}

export function HabitActionsMenu({
  status,
  isCompleted,
  onEdit,
  onPause,
  onReactivate,
  onBlock,
  onUnblock,
  onMarkComplete,
}: HabitActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl border-gray-light-mode-200 bg-base-white text-gray-light-mode-600 hover:bg-gray-light-mode-50 hover:text-gray-light-mode-900"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {status === habitStatusEnumObject.active ? (
          <DropdownMenuItem onClick={onPause}>
            <Pause className="mr-2 h-4 w-4" />
            Pausar
          </DropdownMenuItem>
        ) : null}

        {status === habitStatusEnumObject.paused ? (
          <DropdownMenuItem onClick={onReactivate}>
            <Play className="mr-2 h-4 w-4" />
            Reactivar
          </DropdownMenuItem>
        ) : null}

        {status !== habitStatusEnumObject.blocked ? (
          <DropdownMenuItem onClick={onBlock} className="text-red-400">
            <Ban className="mr-2 h-4 w-4" />
            Bloquear
          </DropdownMenuItem>
        ) : null}

        {status === habitStatusEnumObject.blocked ? (
          <DropdownMenuItem onClick={onUnblock}>
            <Play className="mr-2 h-4 w-4" />
            Desbloquear
          </DropdownMenuItem>
        ) : null}

        {!isCompleted && status === habitStatusEnumObject.active ? (
          <React.Fragment>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onMarkComplete}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Marcar completado
            </DropdownMenuItem>
          </React.Fragment>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
