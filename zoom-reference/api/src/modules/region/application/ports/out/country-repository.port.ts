import { Country, type NewCountryProps } from '../../../domain/country.entity';

export abstract class CountryRepositoryPort {
	abstract create(props: NewCountryProps): Promise<Country>;
	abstract save(country: Country): Promise<Country>;
	abstract findById(id: string): Promise<{ id: string } | null>;
	abstract findByLegacyId(legacyId: number): Promise<Country | null>;
	abstract findByIsoCode(isoCode: string): Promise<{ id: string } | null>;
	/** Returns the default country (Venezuela) or null if not seeded. */
	abstract findDefault(): Promise<{ id: string } | null>;
	abstract findAll(): Promise<Country[]>;
}
