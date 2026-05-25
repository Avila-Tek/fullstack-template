export interface UpsertDeviceResult {
	id: string;
	isNew: boolean;
	/** IP address stored before this upsert; undefined when the device is new. */
	previousIpAddress?: string;
}

/**
 * Device fingerprinting — two-tier strategy
 *
 * Primary:  zoom_device_id httpOnly cookie → `touchDevice()`.
 *           Single atomic UPDATE...RETURNING: verifies ownership, refreshes
 *           ipAddress, userAgent, deviceName, deviceType, and lastLoginAt.
 *           Stable across browser UA changes. Suppresses false-positive
 *           "new device" alerts caused by minor browser version bumps.
 *
 * Fallback: (userId, userAgent) → `upsert()`.
 *           Used only when the cookie is absent (first-ever login from this
 *           browser) or resolves to an unknown device (stale / different user).
 *           Known limitations of the UA key:
 *             - UA strings are spoofable: an attacker who knows the victim's
 *               UA string and has no cookie can bypass new-device detection.
 *             - IP equality is used as a location-change proxy; it fires on
 *               DHCP renewals and does not detect same-IP different locations.
 */
export abstract class DeviceRepositoryPort {
	abstract upsert(params: {
		userId: string;
		deviceName: string;
		deviceType: string;
		userAgent: string;
		ipAddress: string;
	}): Promise<UpsertDeviceResult>;

	/**
	 * Atomically verifies the device belongs to the user and refreshes
	 * ipAddress, userAgent, deviceName, deviceType, and lastLoginAt in a
	 * single UPDATE ... RETURNING (cookie-resolution path).
	 * Returns the device id on success, null when no matching row exists.
	 */
	abstract touchDevice(params: {
		id: string;
		userId: string;
		userAgent: string;
		deviceName: string;
		deviceType: string;
		ipAddress: string;
	}): Promise<{ id: string } | null>;
}
