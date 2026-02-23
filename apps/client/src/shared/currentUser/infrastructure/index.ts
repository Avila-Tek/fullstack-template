import { getAPIClient } from '@/src/lib/api';
import { CurrentUserServiceClass } from './currentUser.service';

/**
 * Default service instance using the real API client.
 * For testing, instantiate CurrentUserServiceClass with a mock CurrentUserApi.
 */
const api = getAPIClient();
export const CurrentUserService = new CurrentUserServiceClass(api.v1.auth);
