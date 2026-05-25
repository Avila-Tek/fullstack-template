import { SetMetadata } from '@nestjs/common';

export const SKIP_API_RESPONSE = 'skipApiResponse';

/** Apply to a controller or handler to bypass the ApiResponseInterceptor wrapper. */
export const SkipApiResponse = () => SetMetadata(SKIP_API_RESPONSE, true);
