/**
 * Plan limits shape used to build the display feature list.
 * No dependency on schemas or features.
 */
export interface PlanLimitsForFeatures {
  habitsMax: number | null;
  reportsEnabled: boolean;
  historyDays: number | null;
  remindersEnabled: boolean;
}

export interface PlanFeatureItem {
  text: string;
  isEnabled: boolean;
}

/**
 * Build the full plan feature list (Spanish labels) for display in plan cards.
 * Returns [] when limits is null/undefined (e.g. checkout when API omits limits).
 */
export function getPlanFeaturesForDisplay(
  limits: PlanLimitsForFeatures | null | undefined,
  isFree: boolean
): PlanFeatureItem[] {
  if (limits == null) {
    return [];
  }

  return [
    {
      text: limits.habitsMax
        ? `Hasta ${limits.habitsMax} hábitos`
        : 'Hábitos ilimitados',
      isEnabled: true,
    },
    {
      text: 'Reportes detallados y análisis',
      isEnabled: limits.reportsEnabled,
    },
    {
      text: limits.historyDays
        ? `${limits.historyDays} días de historial`
        : 'Historial ilimitado',
      isEnabled: true,
    },
    {
      text: 'Recordatorios por email',
      isEnabled: limits.remindersEnabled,
    },
    {
      text: 'Soporte prioritario',
      isEnabled: !isFree,
    },
    {
      text: 'Exportar datos',
      isEnabled: !isFree,
    },
    {
      text: 'Integraciones avanzadas',
      isEnabled: limits.reportsEnabled && !isFree,
    },
  ];
}
