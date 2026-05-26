import type { TTutorialVideoItem } from '@zoom/schemas';

export abstract class TutorialVideoCachePort {
	/** Always resolves — implementations must absorb errors silently (returning null on failure). */
	abstract get(key: string): Promise<TTutorialVideoItem | null>;
	/** Always resolves — implementations must absorb errors silently. */
	abstract set(
		key: string,
		value: TTutorialVideoItem,
		ttlSeconds: number,
	): Promise<void>;
	/** Always resolves — implementations must absorb errors silently. */
	abstract del(key: string): Promise<void>;
}

export const TUTORIAL_VIDEO_CACHE_PORT = Symbol('TutorialVideoCachePort');
