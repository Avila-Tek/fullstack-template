import type { BannerItem } from '@zoom/schemas';

export abstract class BannerStoragePort {
	abstract fetchManifest(): Promise<{ banners: BannerItem[] } | null>;
}
