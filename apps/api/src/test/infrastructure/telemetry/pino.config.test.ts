import { describe, it, expect } from 'vitest';
import { pinoConfig, buildErrSerializer } from '../../../infrastructure/telemetry/pino.config.js';

// pinoHttp is typed as Options from pino-http — access as a plain object for assertions
const http = pinoConfig.pinoHttp as Record<string, unknown>;
const formatters = http.formatters as Record<
  string,
  (arg: unknown) => Record<string, unknown>
>;
const customAttributeKeys = http.customAttributeKeys as Record<string, string>;
const customProps = http.customProps as (req: Record<string, unknown>) => Record<string, unknown>;

describe('pinoConfig — field schema alignment', () => {
  it('uses "message" as the log message key (not "msg")', () => {
    expect(http.messageKey).toBe('message');
  });

  it('formats level as a string label, not a numeric code', () => {
    expect(formatters.level('info')).toEqual({ level: 'info' });
    expect(formatters.level('error')).toEqual({ level: 'error' });
    expect(formatters.level('warn')).toEqual({ level: 'warn' });
    expect(formatters.level('debug')).toEqual({ level: 'debug' });
  });

  it('maps responseTime → durationMs via customAttributeKeys', () => {
    expect(customAttributeKeys.responseTime).toBe('durationMs');
  });

  it('injects service.name, service.version, deployment.environment via bindings', () => {
    const result = formatters.bindings({});
    expect(result['service.name']).toBe('test-service'); // from test setup.ts
    expect(result['service.version']).toBeDefined();
    expect(result['deployment.environment']).toBeDefined();
    // pid and hostname must NOT appear in structured logs
    expect(result['pid']).toBeUndefined();
    expect(result['hostname']).toBeUndefined();
  });

  it('emits requestId (not correlationId) from the incoming request', () => {
    const result = customProps({ correlationId: 'req-abc-123' });
    expect(result['requestId']).toBe('req-abc-123');
    expect(result['correlationId']).toBeUndefined();
  });

  it('does not emit requestId when correlationId is absent', () => {
    const result = customProps({});
    expect(result['requestId']).toBeUndefined();
  });
});

describe('buildErrSerializer', () => {
  it('keeps the stack trace in non-production', () => {
    const serialize = buildErrSerializer(false);
    const err = new Error('something broke');
    const result = serialize(err) as Record<string, unknown>;

    expect(result['stack']).toBeDefined();
    expect(result['message']).toBe('something broke');
  });

  it('drops the stack trace in production', () => {
    const serialize = buildErrSerializer(true);
    const err = new Error('something broke');
    const result = serialize(err) as Record<string, unknown>;

    expect(result['stack']).toBeUndefined();
    expect(result['type']).toBe('Error');
    expect(result['message']).toBe('something broke');
  });

  it('preserves error type in both environments', () => {
    const prodSerialize = buildErrSerializer(true);
    const devSerialize = buildErrSerializer(false);
    class CustomError extends Error { name = 'CustomError'; }

    expect((prodSerialize(new CustomError()) as Record<string, unknown>)['type']).toBe('CustomError');
    expect((devSerialize(new CustomError()) as Record<string, unknown>)['type']).toBeDefined();
  });

  it('handles non-Error throws defensively (production)', () => {
    const serialize = buildErrSerializer(true);
    expect((serialize('string error') as Record<string, unknown>)['type']).toBe('UnknownError');
    expect((serialize('string error') as Record<string, unknown>)['message']).toBe('string error');
  });

  it('handles non-Error throws defensively (development)', () => {
    const serialize = buildErrSerializer(false);
    const result = serialize({ code: 'custom' }) as Record<string, unknown>;
    expect(result['type']).toBe('UnknownError');
    expect(result['stack']).toBeUndefined();
  });
});
