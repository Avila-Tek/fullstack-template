import { getAPIClient } from '@/src/lib/api';
import { AuthServiceClass } from './auth';

const api = getAPIClient();
export const AuthService = new AuthServiceClass(api.v1.auth);
