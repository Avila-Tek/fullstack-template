import {
  buildPaginationSchemaForModel,
  buildSafeResponseSchema,
  TPagination as Pagination,
  TCreateUserInput,
  TPaginationInput,
  TUser,
  userSchema,
} from '@repo/schemas';
import { Safe, safe, safeFetch } from '@repo/utils';
import { z } from 'zod';
import { TRequestConfig } from '../types';

export class UserService {
  constructor(
    private baseUrl: string,
    private token?: string
  ) {
    this.create.bind(this);
  }

  async create(
    input: TCreateUserInput,
    config?: TRequestConfig
  ): Promise<Safe<TUser>> {
    const response = await safeFetch(
      new URL(`${this.baseUrl}/v1/users/create`),
      {
        body: JSON.stringify(input),
        ...(config ?? {}),
        headers: {
          ...(config?.headers ?? {}),
          ...(typeof this.token !== 'undefined'
            ? { Authorization: `Bearer ${this.token}` }
            : {}),
        },
      }
    );
    if (response.success) {
      const parseResponse = safe(() => userSchema.parse(response.data));
      return parseResponse;
    }
    return response;
  }

  async pagination(
    input: TPaginationInput,
    config?: TRequestConfig
  ): Promise<Safe<Pagination<TUser>>> {
    const qs = new URLSearchParams([
      ['page', String(input.page)],
      ['perPage', String(input.perPage)],
    ]);
    const response = await safeFetch(
      new URL(`${this.baseUrl}/v1/users?${qs.toString()}`),
      {
        method: 'GET',
        ...(config ?? {}),
        headers: {
          ...(config?.headers ?? {}),
          ...(typeof this.token !== 'undefined'
            ? { Authorization: `Bearer ${this.token}` }
            : {}),
        },
      }
    );
    if (!response.success) {
      return response;
    }

    const safeParsedData = buildSafeResponseSchema(
      buildPaginationSchemaForModel(userSchema)
    ).safeParse(response.data);

    if (!safeParsedData.success) {
      console.error(z.prettifyError(safeParsedData.error));
      return { success: false, error: 'Internal Server Error' };
    }

    if (!safeParsedData.data.success) {
      console.error(safeParsedData.data.error);
      return { success: false, error: 'Internal Server Error' };
    }

    return {
      success: true,
      data: safeParsedData.data.data,
    };
  }
}
