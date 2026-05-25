export interface OfficeRecord {
	id: string;
	name: string;
	address: string | null;
}

export interface CityWithOfficesRecord {
	id: string;
	name: string;
}

export abstract class OfficeMasterRepositoryPort {
	abstract findActiveById(id: string): Promise<OfficeRecord | null>;
	abstract findActiveByCityId(cityId: string): Promise<OfficeRecord[]>;
	abstract findDistinctActiveCities(): Promise<CityWithOfficesRecord[]>;
}
