/**
 * Minimal token provider interface. Both ZoomAuthClient and any NestJS wrapper
 * (e.g. ZoomAuthService) implement this so ZoomEmailClient / ZoomSmsClient can
 * accept either without depending on a concrete class.
 */
export interface ZoomTokenProvider {
  getToken(): Promise<string>;
  invalidateToken(): void;
}
