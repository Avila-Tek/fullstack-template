export interface CityTaxRates {
	nationalVatRate: string | null;
	nationalSurchargeRate: string | null;
	internationalVatRate: string | null;
	internationalSurchargeRate: string | null;
}

/**
 * CityTaxRatesReaderPort — pricing's facade into the `region` module for VAT
 * + complement lookup on a single city row.
 *
 * Per the catalog-module convention in `apps/api/CLAUDE.md` (rule 3), the
 * abstract class is defined HERE (in the consumer) and implemented in
 * `region/infrastructure/adapters/city-tax-rates-reader.adapter.ts`.
 *
 * See Deviation 3 in spec_back.md — `funiva` + `funcomplemento` are combined
 * into one read because both values live on the same `city_master` row.
 */
export abstract class CityTaxRatesReaderPort {
	abstract findCityTaxRates(cityId: string): Promise<CityTaxRates | null>;
}
