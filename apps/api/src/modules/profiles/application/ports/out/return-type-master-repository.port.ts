export interface ReturnTypeRecord {
	id: string;
	legacyId: number;
	name: string;
}

export abstract class ReturnTypeMasterRepositoryPort {
	abstract findFirstActive(): Promise<{ id: string } | null>;
	abstract findActiveById(id: string): Promise<ReturnTypeRecord | null>;
	abstract findActiveByLegacyIds(
		legacyIds: number[],
	): Promise<ReturnTypeRecord[]>;
}
