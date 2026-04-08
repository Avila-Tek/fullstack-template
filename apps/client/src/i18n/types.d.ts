import type authEn from '../features/auth/i18n/en';
import type sharedEn from '../shared/i18n/en';

type Messages = {
  auth: typeof authEn;
  shared: typeof sharedEn;
};

declare global {
  // Enforces that en.ts has the same key structure as es.ts (values may differ)
  type DeepString<T> = {
    [K in keyof T]: T[K] extends readonly (infer _U)[]
      ? readonly string[]
      : T[K] extends object
        ? DeepString<T[K]>
        : string;
  };

  interface IntlMessages extends Messages {}
}
