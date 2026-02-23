import { AuthService } from './components/auth';
import { UserService } from './components/users';
import type { HttpClient, TokenProvider } from './http';
import { SafeFetchClient } from './http';
import { getAccessToken } from './lib/token';

/**
 * API configuration
 */
export interface APIConfig {
  baseURL: string;
  token?: TokenProvider;
  /** Optional: provide a custom HttpClient implementation (for testing or alternative transports) */
  httpClient?: HttpClient;
}

/**
 * Versioned API service interface
 */
export interface APIService {
  auth: AuthService;
  users: UserService;
}

export class API {
  public readonly v1: APIService;

  /** Exposed for advanced use cases (e.g., making raw requests) */
  public readonly httpClient: HttpClient;

  constructor(config: APIConfig) {
    // Use provided HttpClient or create SafeFetchHttpClient
    this.httpClient =
      config.httpClient ??
      new SafeFetchClient({
        baseUrl: config.baseURL,
        // TODO how to handle getAccessTokenAsync() to get it from the cookies
        token: config.token ?? getAccessToken(),
      });

    // Wire services with dependencies
    this.v1 = Object.freeze({
      auth: new AuthService(this.httpClient, config.baseURL),
      users: new UserService(this.httpClient),
    });
  }
}
