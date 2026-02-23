import type { Safe } from '@repo/utils';
import {
  type HttpClient,
  type HttpMethod,
  type HttpRequestOptions,
  httpMethodEnumObject,
  type InferResponseType,
  type QueryParams,
  type ZodLikeSchema,
} from '../port/httpClient.port';

interface MockResponse<T = unknown> {
  data: T;
}

interface MockCall {
  method: string;
  path: string;
  schema?: ZodLikeSchema;
  body?: unknown;
  params?: QueryParams;
  options?: HttpRequestOptions;
}

/**
 * MockHttpClient - Test implementation of HttpClient
 *
 * Allows setting up canned responses and inspecting calls made.
 * Supports optional schema validation like the real implementation.
 */
export class MockHttpClient implements HttpClient {
  public calls: MockCall[] = [];
  private responses = new Map<string, MockResponse>();
  private defaultResponse: MockResponse = { data: {} };

  mockResponse<T>(path: string, response: MockResponse<T>): void {
    this.responses.set(path, response);
  }

  setDefaultResponse<T>(response: MockResponse<T>): void {
    this.defaultResponse = response;
  }

  mockError(path: string, error: string): void {
    this.responses.set(path, { data: { __mockError: error } });
  }

  reset(): void {
    this.calls = [];
    this.responses.clear();
  }

  async get<T = unknown, TSchema extends ZodLikeSchema | undefined = undefined>(
    path: string,
    params?: QueryParams,
    options?: HttpRequestOptions,
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>> {
    return this.handleRequest<T, TSchema>({
      method: httpMethodEnumObject.GET,
      path,
      body: undefined,
      params,
      options,
      schema,
    });
  }

  async post<
    T = unknown,
    TSchema extends ZodLikeSchema | undefined = undefined,
  >(
    path: string,
    body?: unknown,
    params?: QueryParams,
    options?: HttpRequestOptions,
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>> {
    return this.handleRequest<T, TSchema>({
      method: httpMethodEnumObject.POST,
      path,
      body,
      params,
      options,
      schema,
    });
  }

  async put<T = unknown, TSchema extends ZodLikeSchema | undefined = undefined>(
    path: string,
    body?: unknown,
    params?: QueryParams,
    options?: HttpRequestOptions,
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>> {
    return this.handleRequest<T, TSchema>({
      method: httpMethodEnumObject.PUT,
      path,
      body,
      params,
      options,
      schema,
    });
  }

  async patch<
    T = unknown,
    TSchema extends ZodLikeSchema | undefined = undefined,
  >(
    path: string,
    body?: unknown,
    params?: QueryParams,
    options?: HttpRequestOptions,
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>> {
    return this.handleRequest<T, TSchema>({
      method: httpMethodEnumObject.PATCH,
      path,
      body,
      params,
      options,
      schema,
    });
  }

  async delete<
    T = unknown,
    TSchema extends ZodLikeSchema | undefined = undefined,
  >(
    path: string,
    params?: QueryParams,
    options?: HttpRequestOptions,
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>> {
    return this.handleRequest<T, TSchema>({
      method: httpMethodEnumObject.DELETE,
      path,
      body: undefined,
      params,
      options,
      schema,
    });
  }

  // ============================================================
  // INTERNAL
  // ============================================================

  private handleRequest<T, TSchema extends ZodLikeSchema | undefined>({
    method,
    path,
    body,
    params,
    options,
    schema,
  }: {
    method: HttpMethod;
    path: string;
    body?: unknown;
    params?: QueryParams;
    options?: HttpRequestOptions;
    schema?: TSchema;
  }): Promise<Safe<InferResponseType<T, TSchema>>> {
    this.calls.push({ method, path, body, params, options });

    const response = this.responses.get(path) ?? this.defaultResponse;

    // Check for mock error
    if (
      response.data &&
      typeof response.data === 'object' &&
      '__mockError' in response.data
    ) {
      return Promise.resolve({
        success: false,
        error: (response.data as { __mockError: string }).__mockError,
      });
    }

    // No schema - return raw response
    if (!schema) {
      return Promise.resolve({
        success: true,
        data: response.data as InferResponseType<T, TSchema>,
      });
    }

    // For mocks with schema, handle envelope unwrapping
    const data = response.data as
      | { success: true; data: unknown }
      | { success: false; error: string }
      | unknown;

    const unwrapEnvelope = options?.unwrapEnvelope ?? true;

    if (
      unwrapEnvelope &&
      data &&
      typeof data === 'object' &&
      'success' in data
    ) {
      const envelope = data as
        | { success: true; data: unknown }
        | { success: false; error: string };

      if (!envelope.success) {
        return Promise.resolve({ success: false, error: envelope.error });
      }

      return Promise.resolve({
        success: true,
        data: envelope.data as InferResponseType<T, TSchema>,
      });
    }

    return Promise.resolve({
      success: true,
      data: data as InferResponseType<T, TSchema>,
    });
  }
}
