import { getAPIClient } from '@/src/lib/api';
import { AuthServiceClass } from './auth.service';

/**
 * Default service instance using the real API client.
 * For testing, instantiate AuthServiceClass with a mock AuthApi.
 */
const api = getAPIClient();
export const AuthService = new AuthServiceClass(api.v1.auth);
