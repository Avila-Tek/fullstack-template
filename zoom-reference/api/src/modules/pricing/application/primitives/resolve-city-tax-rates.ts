/**
 * Returns { vatRate, surcharge } for the given city, both pulled from city_master's
 * denormalized columns:
 *   - taxTypeCode = 1 → national_vat_rate + national_surcharge_rate
 *   - taxTypeCode = 2 → international_vat_rate + international_surcharge_rate
 *
 * LEGACY DEVIATION:
 * Legacy splits these into two PostgreSQL stored functions, funiva and funcomplemento,
 * each joining valoriva × ciudadiva and returning a single scalar. Both are always
 * invoked back-to-back on the same city — Casillero (routing2702enproduccion.php
 * L11904–11907), Nacional contado (TarifaDAL.php L245–256), and the International flow
 * all do this. Calling one without the other does not occur anywhere in the legacy.
 *
 * This primitive combines them into one read because:
 *   - Both values live on the same city_master row (denormalized — see the VAT
 *     denormalization tradeoff documented in spec.md)
 *   - Splitting them would mean two db roundtrips per pricing call for no semantic gain
 *   - The tuple return makes "always use both together" a structural property of the
 *     API, not a convention the next maintainer has to discover
 *
 * If a future flow ever needs only one value, destructure and ignore the other field —
 * the cost is one numeric column read, negligible.
 */

import type { CityTaxRatesReaderPort } from '../ports/out/city-tax-rates-reader.port';

export interface ResolveCityTaxRatesInput {
	cityId: string;
	// LEGACY: was `codtipoiva`. 1 = national, 2 = international.
	taxTypeCode: 1 | 2;
}

export interface ResolveCityTaxRatesOutput {
	vatRate: number;
	surcharge: number;
}

export interface ResolveCityTaxRatesDeps {
	cityTaxRatesReader: CityTaxRatesReaderPort;
}

const num = (v: string | null): number => (v === null ? 0 : Number(v));

export async function resolveCityTaxRates(
	input: ResolveCityTaxRatesInput,
	deps: ResolveCityTaxRatesDeps,
): Promise<ResolveCityTaxRatesOutput> {
	const rates = await deps.cityTaxRatesReader.findCityTaxRates(input.cityId);
	if (!rates) {
		return { vatRate: 0, surcharge: 0 };
	}
	if (input.taxTypeCode === 1) {
		return {
			vatRate: num(rates.nationalVatRate),
			surcharge: num(rates.nationalSurchargeRate),
		};
	}
	return {
		vatRate: num(rates.internationalVatRate),
		surcharge: num(rates.internationalSurchargeRate),
	};
}
