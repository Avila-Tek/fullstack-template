import type { Pool } from 'pg';
import type { ExternalCountryDto } from '../../application/ports/out/external-country-source.port';
import { ExternalCountrySourcePort } from '../../application/ports/out/external-country-source.port';

export class HttpExternalCountrySourceAdapter
	implements ExternalCountrySourcePort
{
	constructor(private readonly pool: Pool) {}

	async fetchAll(): Promise<ExternalCountryDto[]> {
		const { rows } = await this.pool.query<ExternalCountryDto>(`
      SELECT
        codpais,
        siglas,
        nombre,
        capital,
        codzona,
        zonamia,
        cobratras,
        tiemposd,
        tiempom,
        tipoidioma,
        codareaint,
        nombredhl,
        inactivo
      FROM pais
    `);

		return rows;
	}
}
