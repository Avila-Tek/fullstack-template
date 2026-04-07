import { describe, expect, it } from 'vitest';
import { parseDeviceName, parseDeviceType } from './parse-device-name';

describe('parseDeviceName', () => {
	it('parses Chrome on macOS', () => {
		const ua =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
		expect(parseDeviceName(ua)).toBe('Chrome on macOS');
	});

	it('parses Safari on iPhone', () => {
		const ua =
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
		expect(parseDeviceName(ua)).toBe('Safari on iPhone');
	});

	it('returns Unknown Device for empty UA', () => {
		expect(parseDeviceName('')).toBe('Unknown Device');
	});

	it('returns Unknown Device for unrecognizable UA', () => {
		expect(parseDeviceName('curl/7.68.0')).toBe('Unknown Device');
	});
});

describe('parseDeviceType', () => {
	it('returns mobile for iPhone UA', () => {
		expect(parseDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS)')).toBe(
			'mobile',
		);
	});

	it('returns tablet for iPad UA', () => {
		expect(parseDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet');
	});

	it('returns desktop for Windows UA', () => {
		expect(parseDeviceType('Mozilla/5.0 (Windows NT 10.0)')).toBe('desktop');
	});

	it('returns unknown for empty UA', () => {
		expect(parseDeviceType('')).toBe('unknown');
	});
});
