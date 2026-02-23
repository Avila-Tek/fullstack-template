import { routeBuilders } from '@/src/shared/routes/routes';

export const NAVBAR_APP_NAME = 'HabitFlow' as const;

export interface NavbarNavItem {
  label: string;
  href: string | ((isAuthenticated: boolean) => string);
}

export const navbarNavItems: NavbarNavItem[] = [
  {
    label: 'Planes',
    href: routeBuilders.plans(),
  },
  {
    label: 'Mis Hábitos',
    href: (isAuthenticated: boolean) =>
      isAuthenticated ? routeBuilders.dashboard() : routeBuilders.login(),
  },
] as const;
