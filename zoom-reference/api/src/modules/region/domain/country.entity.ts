import { CountryId } from './value-objects/country-id.value-object';

export interface CountryProps {
	id: CountryId;
	legacyId: number;
	isoCode: string | null;
	name: string;
	capital: string | null;
	zoneCode: number | null;
	zoneMia: number | null;
	collectTransportCharge: boolean;
	deliveryTimeDays: number | null;
	maritimeTimeDays: number | null;
	languageType: number | null;
	internationalAreaCode: string | null;
	dhlName: string | null;
	isInactive: boolean;
}

export type NewCountryProps = Omit<CountryProps, 'id'>;

export class Country {
	private constructor(private readonly props: CountryProps) {}

	static create(props: CountryProps): Country {
		return new Country(props);
	}

	static restore(props: CountryProps): Country {
		return new Country(props);
	}

	get id(): CountryId {
		return this.props.id;
	}

	get legacyId(): number {
		return this.props.legacyId;
	}

	get isoCode(): string | null {
		return this.props.isoCode;
	}

	get name(): string {
		return this.props.name;
	}

	get capital(): string | null {
		return this.props.capital;
	}

	get zoneCode(): number | null {
		return this.props.zoneCode;
	}

	get zoneMia(): number | null {
		return this.props.zoneMia;
	}

	get collectTransportCharge(): boolean {
		return this.props.collectTransportCharge;
	}

	get deliveryTimeDays(): number | null {
		return this.props.deliveryTimeDays;
	}

	get maritimeTimeDays(): number | null {
		return this.props.maritimeTimeDays;
	}

	get languageType(): number | null {
		return this.props.languageType;
	}

	get internationalAreaCode(): string | null {
		return this.props.internationalAreaCode;
	}

	get dhlName(): string | null {
		return this.props.dhlName;
	}

	get isInactive(): boolean {
		return this.props.isInactive;
	}
}
