'use client';

import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { routeBuilders } from '@/src/shared/routes/routes';

interface PlanLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanLimitModal({ open, onOpenChange }: PlanLimitModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-light-mode-200 bg-base-white shadow-xl sm:max-w-[400px] rounded-2xl">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
            <Sparkles className="h-6 w-6 text-brand-600" />
          </div>
          <DialogTitle className="text-center text-gray-light-mode-900 text-lg font-semibold">
            Límite de tu plan alcanzado
          </DialogTitle>
        </DialogHeader>
        <p className="text-center text-sm text-gray-light-mode-600">
          Has alcanzado el número máximo de hábitos incluidos en tu plan actual.
          Revisa los planes disponibles y mejora para poder crear más hábitos.
        </p>
        <DialogFooter className="flex w-full flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-w-0 flex-1 border-gray-light-mode-300 text-gray-light-mode-700 hover:bg-gray-light-mode-50"
          >
            Cerrar
          </Button>
          <Button
            type="button"
            className="min-w-0 flex-1 bg-brand-solid text-base-white hover:bg-brand-solid_hover"
            asChild
          >
            <Link
              href={routeBuilders.plans()}
              onClick={() => onOpenChange(false)}
            >
              Ver planes
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
