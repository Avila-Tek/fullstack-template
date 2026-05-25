export interface NewBusinessProfileSettingsProps {
	businessProfileId: string;
	internationalMaritimeWeightUnitId: string;
	internationalMaritimeDimensionUnitId: string;
	// printGuide and printQrLabel default to false in DB — omit from required fields
}

export abstract class BusinessProfileSettingsRepositoryPort {
	abstract create(
		data: NewBusinessProfileSettingsProps,
	): Promise<{ id: string }>;
}
