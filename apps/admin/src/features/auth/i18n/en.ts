import type { default as es } from './es';

const auth = {
  validation: {
    emailRequired: 'Email is required',
    emailInvalid: 'Please enter a valid email',
    passwordRequired: 'Password is required',
  },
} as const satisfies DeepString<typeof es>;

export default auth;
