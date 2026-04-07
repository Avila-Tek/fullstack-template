import { SetMetadata } from '@nestjs/common';

export const SKIP_API_RESPONSE = 'skipApiResponse';
export const SkipApiResponse = () => SetMetadata(SKIP_API_RESPONSE, true);
