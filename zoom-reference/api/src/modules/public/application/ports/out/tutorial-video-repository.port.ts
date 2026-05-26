import type { TTutorialVideoItem } from '@zoom/schemas';

export abstract class TutorialVideoRepositoryPort {
	abstract findBySection(section: string): Promise<TTutorialVideoItem | null>;
}

export const TUTORIAL_VIDEO_REPOSITORY_PORT = Symbol(
	'TutorialVideoRepositoryPort',
);
