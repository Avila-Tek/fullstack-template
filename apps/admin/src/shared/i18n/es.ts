const shared = {
  errors: {
    generic: 'Algo salió mal',
    network: 'Error de conexión. Intenta de nuevo.',
  },
  loading: {
    defaultText: 'Por favor espera...',
  },
  metadata: {
    defaultTitle: 'HabitFlow Admin',
    defaultDescription: 'Panel de administración de HabitFlow',
  },
} as const;

export default shared;
