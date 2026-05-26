export interface TInternationalShippingCity {
  cod_pais: string;
  cod_estado: string;
  nombre_ciudad: string;
  zip_code: string;
  suburb: string;
}

export interface TInternationalShippingCountry {
  codigoPais: number;
  nombrePais: string;
  nombrePaisDHL: string | null;
  siglas: string;
}

export interface TPaginatedCities {
  data: TInternationalShippingCity[];
  total: number;
  page: number;
  limit: number;
}
