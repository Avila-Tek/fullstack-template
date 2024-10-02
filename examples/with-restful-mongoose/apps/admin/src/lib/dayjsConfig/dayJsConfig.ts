/**
 * Configures `dayjs` with UTC and Timezone support, and sets the default timezone to "America/Caracas".
 * Also sets the locale to Spanish (`es`).
 *
 * Plugins:
 * 1. **UTC**: Enables UTC date handling.
 * 2. **Timezone**: Supports working with different timezones.
 *
 * Example usage:
 *
 * 1. Get current time in "America/Caracas":
 * ```ts
 * import dayjs from './dayjs';
 * console.log(dayjs().format('YYYY-MM-DD HH:mm:ss'));
 * ```
 *
 * 2. Convert UTC date to the default timezone:
 * ```ts
 * const utcDate = dayjs.utc('2024-09-01T15:00:00Z');
 * console.log(utcDate.tz().format('YYYY-MM-DD HH:mm:ss'));
 * ```
 *
 * @see https://day.js.org/docs/en/timezone/working-with-timezones for more details.
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Set default timezone to "America/Caracas"
dayjs.tz.setDefault('America/Caracas');

export default dayjs;
