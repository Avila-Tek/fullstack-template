//@ts-ignore
import { TextDecoder, TextEncoder } from 'node:util';
//@ts-ignore
import { clearImmediate } from 'node:timers';
import { ReadableStream, TransformStream } from 'node:stream/web';
import { PerformanceObserver, performance } from 'node:perf_hooks';

Object.defineProperties(globalThis, {
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder },
  ReadableStream: { value: ReadableStream },
  clearImmediate: { value: clearImmediate },
  TransformStream: { value: TransformStream },
  performance: { value: performance },
  PerformanceObserver: { value: PerformanceObserver },
});

import { Blob, File } from 'node:buffer';
import { fetch, Headers, FormData, Request, Response } from 'undici';

Object.defineProperties(globalThis, {
  fetch: { value: fetch, writable: true },
  Blob: { value: Blob },
  File: { value: File },
  Headers: { value: Headers },
  FormData: { value: FormData },
  Request: { value: Request },
  Response: { value: Response },
});
