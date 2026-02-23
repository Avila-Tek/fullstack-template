/**
 * Format price from cents to currency string
 * @param amountCents - Amount in cents
 * @param currency - Currency code (e.g., 'usd', 'eur')
 * @returns Formatted price string
 */
export function formatPrice(amountCents: number, currency: string): string {
  if (amountCents === 0) {
    return 'Free';
  }
  const amount = amountCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Format billing interval for display
 * @param interval - Interval string (e.g., 'month', 'year', 'forever')
 * @returns Formatted interval string
 */
export function formatInterval(interval: string): string {
  const intervals: Record<string, string> = {
    month: '/mes',
    year: '/año',
    forever: '',
  };
  return intervals[interval] ?? `/${interval}`;
}

/**
 * Format billing interval as a label (e.g. "month" -> "Monthly")
 * @param interval - Interval string (e.g., 'month', 'year')
 * @returns Capitalized label or null if not a known interval
 */
export function formatBillingCycleLabel(interval: string): string | null {
  if (!interval) return null;
  const labels: Record<string, string> = {
    month: 'Monthly',
    year: 'Yearly',
  };
  return labels[interval] ?? null;
}
