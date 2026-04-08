import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale;
  const [auth, shared] = await Promise.all([
    import(`../features/auth/i18n/${locale}`),
    import(`../shared/i18n/${locale}`),
  ]);
  return {
    locale,
    messages: {
      auth: auth.default,
      shared: shared.default,
    },
  };
});
