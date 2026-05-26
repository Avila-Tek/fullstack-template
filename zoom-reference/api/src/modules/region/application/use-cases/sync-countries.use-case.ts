import { Inject, Injectable, Optional } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { Country, type NewCountryProps } from '../../domain/country.entity';
import {
	type SyncCountriesResult,
	SyncCountriesUseCasePort,
} from '../ports/in/sync-countries.use-case.port';
import { CountryRepositoryPort } from '../ports/out/country-repository.port';
import {
	type ExternalCountryDto,
	ExternalCountrySourcePort,
} from '../ports/out/external-country-source.port';

const truncate = (
	value: string | null | undefined,
	max: number,
): string | null => {
	if (value == null) return null;
	return value.length > max ? value.slice(0, max) : value;
};

const coerceBool = (value: boolean | null | undefined): boolean =>
	value ?? false;

@Injectable()
export class SyncCountriesUseCase implements SyncCountriesUseCasePort {
	constructor(
		private readonly externalSource: ExternalCountrySourcePort,
		private readonly countryRepository: CountryRepositoryPort,
		@Inject(LOGGER_PORT)
		@Optional()
		private readonly logger?: IStructuredLogger,
	) {}

	async execute(): Promise<SyncCountriesResult> {
		this.logger?.info(
			{ event: 'region.sync.start', source: 'external' },
			'Region sync started',
		);
		recordApiEvent('region.sync.start', { module: 'region' });

		// Top-level fetches happen before any per-item recovery is possible.
		// Without this guard, an outage in the legacy source or our own DB
		// would tick `region.sync.start` and then throw — the run becomes
		// invisible to dashboards because neither `region.sync.complete` nor
		// the per-item `region.sync.error` fires. We emit a terminal failure
		// metric so the dashboard's "time since last sync" + the error rate
		// both show the aborted run, then rethrow so the scheduler/observer
		// gets the original exception.
		let externalRows: ExternalCountryDto[];
		let allExisting: Country[];
		try {
			externalRows = await this.externalSource.fetchAll();
			allExisting = await this.countryRepository.findAll();
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.logger?.error(
				{ event: 'region.sync.error', errorCode: 'SYNC_ABORTED', message },
				'Region sync aborted before processing',
			);
			recordApiEvent('region.sync.error', {
				module: 'region',
				outcome: 'failure',
				error_code: 'SYNC_ABORTED',
			});
			throw err;
		}

		const existingByLegacyId = new Map<number, Country>(
			allExisting.map((c) => [c.legacyId, c]),
		);

		let created = 0;
		let updated = 0;
		const errors: string[] = [];

		for (const dto of externalRows) {
			try {
				const props = this.mapToProps(dto);
				const existingCountry = existingByLegacyId.get(dto.codpais);

				if (existingCountry == null) {
					await this.countryRepository.create(props);
					created++;
				} else {
					const updatedCountry = Country.restore({
						id: existingCountry.id,
						...props,
					});
					await this.countryRepository.save(updatedCountry);
					updated++;
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				errors.push(`[codpais=${dto.codpais}] ${message}`);
				this.logger?.warn(
					{
						event: 'region.sync.error',
						errorCode: 'SYNC_ITEM_FAILED',
						message,
					},
					'Region sync item failed',
				);
				recordApiEvent('region.sync.error', {
					module: 'region',
					outcome: 'failure',
					error_code: 'SYNC_ITEM_FAILED',
				});
			}
		}

		this.logger?.info(
			{
				event: 'region.sync.complete',
				inserted: created,
				updated,
				total: externalRows.length,
			},
			'Region sync complete',
		);
		recordApiEvent('region.sync.complete', {
			module: 'region',
			outcome: errors.length === 0 ? 'success' : 'partial',
		});

		return { created, updated, errors };
	}

	private mapToProps(dto: ExternalCountryDto): NewCountryProps {
		return {
			legacyId: dto.codpais,
			isoCode: truncate(dto.siglas, 3),
			name: truncate(dto.nombre, 80) ?? '',
			capital: truncate(dto.capital, 120),
			zoneCode: dto.codzona ?? null,
			zoneMia: dto.zonamia ?? null,
			collectTransportCharge: coerceBool(dto.cobratras),
			deliveryTimeDays: dto.tiemposd ?? null,
			maritimeTimeDays: dto.tiempom ?? null,
			languageType: dto.tipoidioma ?? null,
			internationalAreaCode: truncate(dto.codareaint, 20),
			dhlName: truncate(dto.nombredhl, 120),
			isInactive: coerceBool(dto.inactivo),
		};
	}
}
