export interface SyncCountriesResult {
	created: number;
	updated: number;
	errors: string[];
}

export abstract class SyncCountriesUseCasePort {
	abstract execute(): Promise<SyncCountriesResult>;
}
