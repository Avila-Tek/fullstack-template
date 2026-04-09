import type authEn from '../features/auth/i18n/en';
import type adminEn from '../features/admin/i18n/en';
import type userManagementEn from '../features/userManagement/i18n/en';
import type sharedEn from '../shared/i18n/en';

type Messages = {
  auth: typeof authEn;
  admin: typeof adminEn;
  userManagement: typeof userManagementEn;
  shared: typeof sharedEn;
};

declare global {
  type DeepString<T> = {
    [K in keyof T]: T[K] extends readonly (infer _U)[]
      ? readonly string[]
      : T[K] extends object
        ? DeepString<T[K]>
        : string;
  };

  interface IntlMessages extends Messages {}
}
