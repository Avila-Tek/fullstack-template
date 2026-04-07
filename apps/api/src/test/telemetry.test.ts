import { describe, expect, it, vi } from 'vitest';

const { mockStart, MockNodeSDK } = vi.hoisted(() => {
	const mockStart = vi.fn();
	// Must use `function` keyword — arrow functions are not constructors (vitest 4.x)
	const MockNodeSDK = vi.fn(function (this: {
		start: typeof mockStart;
		shutdown: unknown;
	}) {
		this.start = mockStart;
		this.shutdown = vi.fn();
	});
	return { mockStart, MockNodeSDK };
});

vi.mock('@opentelemetry/sdk-node', () => ({ NodeSDK: MockNodeSDK }));
vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
	getNodeAutoInstrumentations: vi.fn().mockReturnValue([]),
}));
vi.mock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
	OTLPTraceExporter: vi.fn(function (this: unknown) {
		/* no-op constructor */
	}),
}));
vi.mock('@opentelemetry/exporter-metrics-otlp-grpc', () => ({
	OTLPMetricExporter: vi.fn(function (this: unknown) {
		/* no-op constructor */
	}),
}));
vi.mock('@opentelemetry/exporter-logs-otlp-grpc', () => ({
	OTLPLogExporter: vi.fn(function (this: unknown) {
		/* no-op constructor */
	}),
}));
vi.mock('@opentelemetry/sdk-metrics', () => ({
	PeriodicExportingMetricReader: vi.fn(function (this: unknown) {
		/* no-op constructor */
	}),
}));
vi.mock('@opentelemetry/sdk-logs', () => ({
	SimpleLogRecordProcessor: vi.fn(function (this: unknown) {
		/* no-op constructor */
	}),
}));
vi.mock('@opentelemetry/resources', () => ({
	resourceFromAttributes: vi.fn().mockReturnValue({}),
}));

describe('telemetry bootstrap', () => {
	it('starts the NodeSDK on import', async () => {
		await import('../telemetry.js');
		expect(MockNodeSDK).toHaveBeenCalledOnce();
		expect(mockStart).toHaveBeenCalledOnce();
	});

	it('configures the service name from OTEL_SERVICE_NAME env', async () => {
		const { resourceFromAttributes } = await import('@opentelemetry/resources');
		expect(resourceFromAttributes).toHaveBeenCalledWith(
			expect.objectContaining({ 'service.name': expect.any(String) }),
		);
	});
});
