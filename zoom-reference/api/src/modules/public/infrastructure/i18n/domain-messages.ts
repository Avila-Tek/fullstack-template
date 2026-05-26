import type { SupportedLocale } from '@zoom/utils';

type PublicErrorCode = 'PUBLIC_TUTORIAL_VIDEO_FETCH_ERROR';

export const publicMessages: Record<
	PublicErrorCode,
	Record<SupportedLocale, string>
> = {
	PUBLIC_TUTORIAL_VIDEO_FETCH_ERROR: {
		es: 'Error al cargar el video tutorial.',
		en: 'Failed to load tutorial video.',
	},
};
