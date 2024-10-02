import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import colors from 'tailwindcss/colors';

/**
 *
 * IMPORTANT: Contact your design team if you need to update any color values!!!
 *
 * IMPORTANT: Do not modify color values directly in this file. All color variables should be defined and modified
 * in the `global.css` file to maintain consistency across the project. This ensures that all color adjustments
 * are centralized and easier to manage.
 *
 *
 * Example:
 * If you need to update the base white or black colors, modify their values in `global.css`:
 * ```css
 * :root {
 *   --color-base-white: #ffffff;
 *   --color-base-black: #000000;
 * }
 * ```
 *
 * The theme here references these variables using `var(--color-variable-name)`.
 */

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...colors,
        base: {
          white: 'var(--color-base-white)',
          black: 'var(--color-base-black)',
          transparent: 'var(--color-base-transparent)',
        },
        'gray-light-mode': {
          25: 'var(--color-gray-light-25)',
          50: 'var(--color-gray-light-50)',
          100: 'var(--color-gray-light-100)',
          200: 'var(--color-gray-light-200)',
          300: 'var(--color-gray-light-300)',
          400: 'var(--color-gray-light-400)',
          500: 'var(--color-gray-light-500)',
          600: 'var(--color-gray-light-600)',
          700: 'var(--color-gray-light-700)',
          800: 'var(--color-gray-light-800)',
          900: 'var(--color-gray-light-900)',
          950: 'var(--color-gray-light-950)',
        },
        'gray-dark-mode': {
          25: 'var(--color-gray-dark-25)',
          50: 'var(--color-gray-dark-50)',
          100: 'var(--color-gray-dark-100)',
          200: 'var(--color-gray-dark-200)',
          300: 'var(--color-gray-dark-300)',
          400: 'var(--color-gray-dark-400)',
          500: 'var(--color-gray-dark-500)',
          600: 'var(--color-gray-dark-600)',
          700: 'var(--color-gray-dark-700)',
          800: 'var(--color-gray-dark-800)',
          900: 'var(--color-gray-dark-900)',
          950: 'var(--color-gray-dark-950)',
        },
        brand: {
          25: 'var(--color-brand-25)',
          50: 'var(--color-brand-50)',
          100: 'var(--color-brand-100)',
          200: 'var(--color-brand-200)',
          300: 'var(--color-brand-300)',
          400: 'var(--color-brand-400)',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
          700: 'var(--color-brand-700)',
          800: 'var(--color-brand-800)',
          900: 'var(--color-brand-900)',
          950: 'var(--color-brand-950)',
        },
        secondary: {
          25: 'var(--color-secondary-25)',
          50: 'var(--color-secondary-50)',
          100: 'var(--color-secondary-100)',
          200: 'var(--color-secondary-200)',
          300: 'var(--color-secondary-300)',
          400: 'var(--color-secondary-400)',
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)',
          700: 'var(--color-secondary-700)',
          800: 'var(--color-secondary-800)',
          900: 'var(--color-secondary-900)',
          950: 'var(--color-secondary-950)',
        },
        tertiary: {
          25: 'var(--color-tertiary-25)',
          50: 'var(--color-tertiary-50)',
          100: 'var(--color-tertiary-100)',
          200: 'var(--color-tertiary-200)',
          300: 'var(--color-tertiary-300)',
          400: 'var(--color-tertiary-400)',
          500: 'var(--color-tertiary-500)',
          600: 'var(--color-tertiary-600)',
          700: 'var(--color-tertiary-700)',
          800: 'var(--color-tertiary-800)',
          900: 'var(--color-tertiary-900)',
          950: 'var(--color-tertiary-950)',
        },
        error: {
          25: 'var(--color-error-25)',
          50: 'var(--color-error-50)',
          100: 'var(--color-error-100)',
          200: 'var(--color-error-200)',
          300: 'var(--color-error-300)',
          400: 'var(--color-error-400)',
          500: 'var(--color-error-500)',
          600: 'var(--color-error-600)',
          700: 'var(--color-error-700)',
          800: 'var(--color-error-800)',
          900: 'var(--color-error-900)',
          950: 'var(--color-error-950)',
        },
        warning: {
          25: 'var(--color-warning-25)',
          50: 'var(--color-warning-50)',
          100: 'var(--color-warning-100)',
          200: 'var(--color-warning-200)',
          300: 'var(--color-warning-300)',
          400: 'var(--color-warning-400)',
          500: 'var(--color-warning-500)',
          600: 'var(--color-warning-600)',
          700: 'var(--color-warning-700)',
          800: 'var(--color-warning-800)',
          900: 'var(--color-warning-900)',
          950: 'var(--color-warning-950)',
        },
        success: {
          25: 'var(--color-success-25)',
          50: 'var(--color-success-50)',
          100: 'var(--color-success-100)',
          200: 'var(--color-success-200)',
          300: 'var(--color-success-300)',
          400: 'var(--color-success-400)',
          500: 'var(--color-success-500)',
          600: 'var(--color-success-600)',
          700: 'var(--color-success-700)',
          800: 'var(--color-success-800)',
          900: 'var(--color-success-900)',
          950: 'var(--color-success-950)',
        },
        fontFamily: {
          sans: [...defaultTheme.fontFamily.sans],
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;
