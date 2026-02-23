import { getEnumObjectFromArray } from '@repo/utils';

export const authSearchParam = [
  'token_hash',
  'type',
  'email',
  'reset',
] as const;
export type TAuthSearchParamEnum = (typeof authSearchParam)[number];
export const authSearchParamEnumObject =
  getEnumObjectFromArray(authSearchParam);

export const authTaglines: Record<TAuthPageTypeEnum, Array<string>> = {
  login: [
    '¿Listo para alcanzar tus metas hoy?',
    '¡Tu racha te espera!',
    'Cada día es un nuevo comienzo.',
    '¡Bienvenido de vuelta, campeón!',
  ],
  signUp: [
    '¡Comienza tu camino hacia mejores hábitos!',
    'Únete a miles construyendo mejores vidas.',
    'Tu yo del futuro te lo agradecerá.',
    'Pequeños pasos, grandes cambios.',
  ],
  forgotPassword: [
    '¡No te preocupes, te ayudamos!',
    'Le pasa a los mejores.',
    'Vamos a ponerte de vuelta en marcha.',
  ],
  verifyEmail: [
    '¡Ya casi!',
    'Un paso más hacia la grandeza.',
    '¡Verifica y empieza a lograr!',
  ],
} as const;

/**
 * Get motivational taglines for auth pages
 */
export function getRandomTagline(page: TAuthPageTypeEnum): string {
  const taglines = authTaglines[page];
  const index = Math.floor(Math.random() * taglines.length);
  return taglines[index] ?? taglines[0] ?? '';
}

export const authPageType = [
  'login',
  'signUp',
  'forgotPassword',
  'verifyEmail',
] as const;
export type TAuthPageTypeEnum = (typeof authPageType)[number];
export const authPageTypeEnumObject = getEnumObjectFromArray(authPageType);

export const supabaseOtpType = ['email'] as const;
export type TSupabaseOtpType = (typeof supabaseOtpType)[number];
export const supabaseOtpTypeEnumObject =
  getEnumObjectFromArray(supabaseOtpType);
