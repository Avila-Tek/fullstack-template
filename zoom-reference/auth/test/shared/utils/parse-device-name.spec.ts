import { describe, expect, it } from 'vitest';
import {
	parseDeviceName,
	parseDeviceType,
} from '../../../src/shared/utils/parse-device-name';

describe('parseDeviceName', () => {
	it('identifies Chrome on macOS', () => {
		const ua =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
		expect(parseDeviceName(ua)).toBe('Chrome on macOS');
	});

	it('identifies Safari on iPhone', () => {
		const ua =
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
		expect(parseDeviceName(ua)).toBe('Safari on iPhone');
	});

	it('identifies Firefox on Windows', () => {
		const ua =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0';
		expect(parseDeviceName(ua)).toBe('Firefox on Windows');
	});

	it('identifies Edge on Windows', () => {
		const ua =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0';
		expect(parseDeviceName(ua)).toBe('Edge on Windows');
	});

	it('returns Unknown Device for empty UA', () => {
		expect(parseDeviceName('')).toBe('Unknown Device');
	});

	it('returns Unknown Device for unrecognised UA', () => {
		expect(parseDeviceName('SomeUnknownBot/1.0')).toBe('Unknown Device');
	});
});

describe('parseDeviceType', () => {
	it('returns mobile for iPhone UA', () => {
		const ua =
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
		expect(parseDeviceType(ua)).toBe('mobile');
	});

	it('returns mobile for Android UA', () => {
		const ua =
			'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';
		expect(parseDeviceType(ua)).toBe('mobile');
	});

	it('returns tablet for iPad UA', () => {
		const ua =
			'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
		expect(parseDeviceType(ua)).toBe('tablet');
	});

	it('returns desktop for macOS Chrome', () => {
		const ua =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';
		expect(parseDeviceType(ua)).toBe('desktop');
	});

	it('returns unknown for empty string', () => {
		expect(parseDeviceType('')).toBe('unknown');
	});
});
