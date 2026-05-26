import { UserService } from './components/users';
import type { HttpClient, TokenProvider } from './http';
import { SafeFetchClient } from './http';

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
  users: UserService;
}

export class API {
  public readonly v1: APIService;

  /** Exposed for advanced use cases (e.g., making raw requests) */
  public readonly httpClient: HttpClient;

  constructor(config: APIConfig) {
    this.httpClient =
      config.httpClient ??
      new SafeFetchClient({
        baseUrl: config.baseURL,
        token: config.token,
      });

    this.v1 = Object.freeze({
      users: new UserService(this.httpClient),
    });
  }
}
