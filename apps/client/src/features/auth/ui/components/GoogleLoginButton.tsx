'use client';

import { GoogleLogoIcon } from '@repo/ui';
import { Button } from '@repo/ui/components/button';
import { useTranslations } from 'next-intl';
import { AuthService } from '../../infrastructure';

export function GoogleLoginButton() {
  const t = useTranslations('auth');

  function handleGoogleLogin() {
    window.location.href = AuthService.getGoogleAuthUrl();
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-11 rounded-xl flex items-center justify-center gap-3 border-white/10 dark:border-white/8 bg-white/5 dark:bg-white/2 hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-150 ease-out active:scale-[0.98]"
      onClick={handleGoogleLogin}
    >
      <GoogleLogoIcon className="h-5 w-5" />
      {t('login.googleButton')}
    </Button>
  );
}
