import { Inject, Injectable, Optional } from '@nestjs/common';
import type { BannerItem } from '@zoom/schemas';
import { BannerItemSchema } from '@zoom/schemas';
import type { IStructuredLogger } from '@zoom/utils';
import { LOGGER_PORT } from '@zoom/utils';
import { GoogleAuth } from 'google-auth-library';
import { env } from '../../../../env';
import { BannerStoragePort } from '../../application/ports/out/banner-storage.port';

@Injectable()
export class GcsBannerStorageAdapter extends BannerStoragePort {
	private readonly auth: GoogleAuth | null;

	constructor(
		@Inject(LOGGER_PORT)
		@Optional()
		private readonly logger?: IStructuredLogger,
	) {
		super();
		const keyB64 = env.GCS_SERVICE_ACCOUNT_KEY;
		if (keyB64) {
			try {
				const credentials = JSON.parse(
					Buffer.from(keyB64, 'base64').toString('utf-8'),
				) as object;
				this.auth = new GoogleAuth({
					credentials,
					scopes: ['https://www.googleapis.com/auth/devstorage.read_only'],
				});
			} catch (err) {
				throw new Error(
					`GCS_SERVICE_ACCOUNT_KEY is malformed — expected base64-encoded service account JSON: ${String(err)}`,
				);
			}
		} else {
			this.auth = null;
		}
	}

	async fetchManifest(): Promise<{ banners: BannerItem[] } | null> {
		const url = `${env.GCS_BUCKET_URL}/${env.GCS_BANNERS_PATH}`;
		const timeout = env.GCS_FETCH_TIMEOUT_MS;
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeout);
		const start = Date.now();

		try {
			// NOTE: timeout only covers the fetch() call; auth token acquisition is unbounded.
			const headers = await this.buildAuthHeaders();
			const response = await fetch(url, {
				signal: controller.signal,
				headers,
			});
			clearTimeout(timer);

			if (!response.ok) {
				this.logger?.error(
					{
						event: 'public_banners_fetch_failure',
						http_status: response.status,
						latency_ms: Date.now() - start,
					},
					'GCS banner fetch returned non-2xx',
				);
				return null;
			}

			const text = await response.text();
			return this.parseManifest(text, Date.now() - start);
		} catch (err) {
			clearTimeout(timer);
			this.logger?.error(
				{
					event: 'public_banners_fetch_failure',
					error: String(err),
					latency_ms: Date.now() - start,
				},
				'GCS banner fetch failed',
			);
			return null;
		}
	}

	private async buildAuthHeaders(): Promise<Record<string, string>> {
		if (!this.auth) return {};
		const token = await this.auth.getAccessToken();
		return token ? { Authorization: `Bearer ${token}` } : {};
	}

	private parseManifest(
		text: string,
		latencyMs: number,
	): { banners: BannerItem[] } {
		let raw: unknown;

		try {
			raw = JSON.parse(text);
		} catch {
			this.logger?.warn(
				{ event: 'public_banners_parse_failure', error: 'Invalid JSON' },
				'GCS banner manifest is not valid JSON',
			);
			return { banners: [] };
		}

		if (
			typeof raw !== 'object' ||
			raw === null ||
			!Array.isArray((raw as Record<string, unknown>).banners)
		) {
			this.logger?.warn(
				{
					event: 'public_banners_parse_failure',
					error: 'Missing banners array',
				},
				'GCS banner manifest has unexpected shape',
			);
			return { banners: [] };
		}

		const rawBanners = (raw as Record<string, unknown[]>).banners;
		const banners: BannerItem[] = [];

		for (const item of rawBanners) {
			const result = BannerItemSchema.safeParse(item);
			if (result.success) {
				banners.push(result.data);
			} else {
				this.logger?.warn(
					{
						event: 'public_banners_parse_failure',
						error: result.error.message,
					},
					'Skipping invalid banner item',
				);
			}
		}

		this.logger?.info(
			{
				event: 'public_banners_fetch_success',
				item_count_raw: rawBanners.length,
				item_count_valid: banners.length,
				latency_ms: latencyMs,
			},
			'GCS banner manifest fetched',
		);

		return { banners };
	}
}
