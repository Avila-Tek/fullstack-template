import type { TTutorialVideoItem } from '@zoom/schemas';

export interface GetPublicTutorialVideoUseCasePort {
	execute(section: string): Promise<TTutorialVideoItem | null>;
}

export const GET_PUBLIC_TUTORIAL_VIDEO_USE_CASE = Symbol(
	'GetPublicTutorialVideoUseCasePort',
);
