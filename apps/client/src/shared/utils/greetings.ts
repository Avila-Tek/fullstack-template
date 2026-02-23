/**
 * Get motivational message based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Buenos días';
  } else if (hour < 18) {
    return 'Buenas tardes';
  } else {
    return 'Buenas noches';
  }
}
