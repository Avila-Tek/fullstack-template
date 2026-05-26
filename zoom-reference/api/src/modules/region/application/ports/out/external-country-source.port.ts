export interface ExternalCountryDto {
	codpais: number;
	siglas: string | null;
	nombre: string;
	capital: string | null;
	codzona: number | null;
	zonamia: number | null;
	cobratras: boolean | null;
	tiemposd: number | null;
	tiempom: number | null;
	tipoidioma: number | null;
	codareaint: string | null;
	nombredhl: string | null;
	inactivo: boolean | null;
}

export abstract class ExternalCountrySourcePort {
	abstract fetchAll(): Promise<ExternalCountryDto[]>;
}
