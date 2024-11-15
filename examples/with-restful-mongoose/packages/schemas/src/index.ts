export * from './users';


// AUX MODELS

export type PageInfo = {
  page: number;
  perPage: number;
  itemCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type Pagination<T> = {
  count: number;
  items: T[];
  pageInfo: PageInfo;
};

export type DocumentModel = {
  file?: File;
  id?: string;
  src?: string | ArrayBuffer;
  name?: string;
};
