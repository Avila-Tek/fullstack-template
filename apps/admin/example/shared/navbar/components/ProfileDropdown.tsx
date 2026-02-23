'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdownMenu';
import { LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/src/shared/currentUser/ui/hooks/useUser';
import { routeBuilders } from '@/src/shared/routes/routes';
import { ProfileCard } from '../../currentUser/ui/components/ProfileCard';

export function ProfileDropdown() {
  const { logout } = useUser();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Menú de perfil">
          <ProfileCard size="sm" showEmail={false} noBorder showPlan={false} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <ProfileCard size="sm" showEmail={false} showPlan noBorder />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href={routeBuilders.profile()}
            className="flex items-center gap-2 cursor-pointer"
          >
            <User className="h-4 w-4" />
            <span>Mi Perfil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => logout()}
          className="flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
