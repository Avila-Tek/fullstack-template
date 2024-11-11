export type TRequestConfig = Parameters<typeof fetch>['1'] & {
  baseUrl: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | undefined;
};
