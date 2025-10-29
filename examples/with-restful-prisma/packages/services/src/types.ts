export type TRequestConfig = Parameters<typeof fetch>['1'] & {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | undefined;
};
