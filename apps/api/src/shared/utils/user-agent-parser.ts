export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export function parseDeviceName(userAgent: string): string {
	if (!userAgent) return 'Unknown Device';

	const browser = detectBrowser(userAgent);
	const os = detectOs(userAgent);

	if (!browser || !os) return 'Unknown Device';
	return `${browser} on ${os}`;
}

export function parseDeviceType(userAgent: string): DeviceType {
	if (!userAgent) return 'unknown';
	const ua = userAgent.toLowerCase();

	if (/ipad/.test(ua)) return 'tablet';
	if (/iphone|android.*mobile|mobile/.test(ua)) return 'mobile';
	if (/windows|macintosh|linux|cros/.test(ua)) return 'desktop';
	return 'unknown';
}

function detectBrowser(ua: string): string | null {
	if (/edg\//i.test(ua)) return 'Edge';
	if (/opr\//i.test(ua)) return 'Opera';
	if (/firefox\//i.test(ua)) return 'Firefox';
	if (/chrome\//i.test(ua)) return 'Chrome';
	if (/safari\//i.test(ua)) return 'Safari';
	return null;
}

function detectOs(ua: string): string | null {
	if (/iphone/i.test(ua)) return 'iPhone';
	if (/ipad/i.test(ua)) return 'iPad';
	if (/android/i.test(ua)) return 'Android';
	if (/macintosh|mac os x/i.test(ua)) return 'macOS';
	if (/windows/i.test(ua)) return 'Windows';
	if (/linux/i.test(ua)) return 'Linux';
	return null;
}
