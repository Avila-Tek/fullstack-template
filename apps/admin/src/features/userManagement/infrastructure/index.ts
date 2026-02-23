import { getAPIClient } from '@/src/lib/api';
import { UserService as UserServiceClass } from './userManagement.service';

/**
 * Default service instance using the real API client.
 * For testing, instantiate UserServiceClass with a mock UserApi.
 */

const api = getAPIClient();
export const UserService = new UserServiceClass(api.v1.users);
