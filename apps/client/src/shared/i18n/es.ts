const shared = {
  errors: {
    generic: 'Algo salió mal',
    network: 'Error de conexión. Intenta de nuevo.',
  },
  loading: {
    defaultText: 'Por favor espera...',
  },
  metadata: {
    defaultTitle: 'HabitFlow',
    defaultDescription: 'Construye mejores hábitos cada día',
  },
} as const;

export default shared;
