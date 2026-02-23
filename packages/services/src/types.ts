/**
 * @deprecated Use `HttpRequestOptions` from './http' instead.
 * This type is kept for backward compatibility during migration.
 */
export type TRequestConfig = Parameters<typeof fetch>['1'] & {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | undefined;
};
