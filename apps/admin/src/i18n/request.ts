import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale;
  const [auth, admin, userManagement, shared] = await Promise.all([
    import(`../features/auth/i18n/${locale}`),
    import(`../features/admin/i18n/${locale}`),
    import(`../features/userManagement/i18n/${locale}`),
    import(`../shared/i18n/${locale}`),
  ]);
  return {
    locale,
    messages: {
      auth: auth.default,
      admin: admin.default,
      userManagement: userManagement.default,
      shared: shared.default,
    },
  };
});
