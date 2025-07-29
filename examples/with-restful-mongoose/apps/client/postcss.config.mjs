import { join } from 'path';

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {
      base: join(process.cwd(), '../../'),
    },
  },
};

export default config;
