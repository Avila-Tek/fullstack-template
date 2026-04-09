import type { default as es } from './es';

const shared = {
  errors: {
    generic: 'Something went wrong',
    network: 'Connection error. Please try again.',
  },
  loading: {
    defaultText: 'Please wait...',
  },
  metadata: {
    defaultTitle: 'HabitFlow Admin',
    defaultDescription: 'HabitFlow administration panel',
  },
} as const satisfies DeepString<typeof es>;

export default shared;
