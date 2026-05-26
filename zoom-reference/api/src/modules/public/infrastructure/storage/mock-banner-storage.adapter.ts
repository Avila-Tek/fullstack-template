import { Injectable } from '@nestjs/common';
import type { BannerItem } from '@zoom/schemas';
import { env } from '../../../../env';
import { BannerStoragePort } from '../../application/ports/out/banner-storage.port';

/**
 * Development-only storage adapter that returns hardcoded banner data.
 * Used when BANNERS_STORAGE_TYPE=mock (i.e. before GCS object storage is provisioned).
 *
 * Image files must be placed in apps/client/public/banners/ so Angular's
 * dev server serves them. The base URL is read from the CORS env var
 * (e.g. http://localhost:4200).
 */
@Injectable()
export class MockBannerStorageAdapter extends BannerStoragePort {
	fetchManifest(): Promise<{ banners: BannerItem[] }> {
		const clientUrl = env.CORS;
		const banners: BannerItem[] = [
			{
				id: 'mock-desktop-1',
				title: 'Banner principal — escritorio',
				imageUrl: `${clientUrl}/banners/banner-desktop.png`,
				linkUrl: null,
				order: 1,
				status: 'published',
				type: 'desktop',
			},
			{
				id: 'mock-mobile-1',
				title: 'Banner principal — móvil',
				imageUrl: `${clientUrl}/banners/banner-mobile.png`,
				linkUrl: null,
				order: 1,
				status: 'published',
				type: 'mobile',
			},
		];
		return Promise.resolve({ banners });
	}
}
