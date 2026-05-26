import { DomainException } from '@zoom/utils';

export class TutorialVideoFetchException extends DomainException {
	constructor(
		public readonly context: 'database' | 'cache',
		meta?: Record<string, unknown>,
	) {
		super('PUBLIC_TUTORIAL_VIDEO_FETCH_ERROR', { ...meta, context });
	}
}
