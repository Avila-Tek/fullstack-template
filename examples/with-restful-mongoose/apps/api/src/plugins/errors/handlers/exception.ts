import { StandardError } from './types';

interface ExceptionInput {
  data: StandardError;
  silent?: boolean;
  params?: Record<string, any>;
}

export class Exception extends Error {
  public data: StandardError;
  public silent: boolean;
  public params: Record<string, any>;

  constructor({ data, params = {}, silent = false }: ExceptionInput) {
    super(data.message.en); // Default english error
    Error.captureStackTrace(this, this.constructor);
    this.data = data;
    this.silent = silent;
    this.params = params;
  }
}
