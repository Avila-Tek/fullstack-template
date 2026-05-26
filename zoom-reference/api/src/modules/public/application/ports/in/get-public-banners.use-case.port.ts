import type { BannerPayload } from '@zoom/schemas';

export abstract class GetPublicBannersUseCasePort {
	abstract execute(): Promise<BannerPayload>;
}
