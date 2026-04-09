const admin = {
  login: {
    title: 'Panel de Administración',
    subtitle: 'Acceso exclusivo para administradores',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'admin@ejemplo.com',
    passwordLabel: 'Contraseña',
    submitButton: 'Iniciar sesión',
    submitLoading: 'Iniciando sesión...',
    notAdmin: '¿No eres administrador?',
    goToMain: 'Ir al sitio principal',
    accessDenied: 'Acceso denegado. Solo los administradores pueden acceder.',
    genericError: 'Error al iniciar sesión',
  },
  dashboard: {
    title: 'Dashboard',
    welcome: 'Bienvenido al panel de administración, {name}',
  },
  layout: {
    sidebarTitle: 'Admin Panel',
    sidebarSubtitle: 'HabitFlow',
    navDashboard: 'Dashboard',
    navUsers: 'Usuarios',
    navPlans: 'Planes',
    navRoles: 'Roles y Permisos',
    signOut: 'Cerrar sesión',
  },
} as const;

export default admin;
