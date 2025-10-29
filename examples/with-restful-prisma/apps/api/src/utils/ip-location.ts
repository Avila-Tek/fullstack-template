import axios from 'axios';

interface GeoLocation {
  ip: string;
  network: string;
  version: string;
  city: string;
  region: string;
  region_code: string;
  country: string;
  country_name: string;
  country_code: string;
  country_code_iso3: string;
  country_capital: string;
  country_tld: string;
  continent_code: string;
  in_eu: false;
  postal: null;
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset: string;
  country_calling_code: string;
  currency: string;
  currency_name: string;
  languages: string;
  country_area: number;
  country_population: number;
  asn: string;
  org: string;
}

export async function getGeoLocationFromIP(ip: string) {
  if (ip === '127.0.0.1' || ip === '::1') {
    return {
      city: 'Caracas',
      country: 'Venezuela',
      countryCode: 'VE',
      region: 'Distrito Capital',
      regionCode: 'D.C.',
      continentCode: 'SA',
      timezone: 'America/Caracas',
      countryLanguages: ['es-VE'],
    };
  }

  const res = await axios.get<GeoLocation>(`https://ipapi.co/${ip}/json/`);
  return {
    city: res.data.city,
    country: res.data.country_name,
    countryCode: res.data.country_code,
    region: res.data.region,
    regionCode: res.data.region_code,
    continentCode: res.data.continent_code,
    timezone: res.data.timezone,
    countryLanguages: res.data.languages
      ?.split?.(',')
      ?.map?.((lang) => lang?.trim()) ?? ['en-US'],
  };
}
