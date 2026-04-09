import type { default as es } from './es';

const admin = {
  login: {
    title: 'Administration Panel',
    subtitle: 'Exclusive access for administrators',
    emailLabel: 'Email address',
    emailPlaceholder: 'admin@example.com',
    passwordLabel: 'Password',
    submitButton: 'Sign in',
    submitLoading: 'Signing in...',
    notAdmin: 'Not an administrator?',
    goToMain: 'Go to main site',
    accessDenied: 'Access denied. Only administrators can access.',
    genericError: 'Error signing in',
  },
  dashboard: {
    title: 'Dashboard',
    welcome: 'Welcome to the admin panel,',
  },
  layout: {
    sidebarTitle: 'Admin Panel',
    sidebarSubtitle: 'HabitFlow',
    navDashboard: 'Dashboard',
    navUsers: 'Users',
    navPlans: 'Plans',
    navRoles: 'Roles & Permissions',
    signOut: 'Sign out',
  },
} as const satisfies DeepString<typeof es>;

export default admin;
