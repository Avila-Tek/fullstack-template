export abstract class DeviceRepositoryPort {
	abstract upsert(params: {
		userId: string;
		deviceName: string;
		deviceType: string;
		userAgent: string;
		ipAddress: string;
	}): Promise<void>;
}
