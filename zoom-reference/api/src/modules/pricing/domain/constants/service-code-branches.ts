// Branch discrimination for the Casillero pricing engine.
//
// "With-freight" — applies sobrepeso + traslado + IVA on freight.
//   21 = PUNTO A PUNTO
//   41 = PUNTO A PUNTO (variant)
//   43 = (legacy paridad — not in current `servicio` catalog)
//   75 = MEDIO PUNTO POR VIAJE
//   76 = PUNTO A PUNTO POR VIAJE
//
// "Flat" — freight = sobrepeso = IVA = 0; total = franqueo_postal only.
//   17 = casillero internacional (out of scope MVP, preserved by formula paridad)
//   18 = CASILLERO NACIONAL CORPORATIVO  ⟵ MVP primary case
//   50, 90, 102 = casilleros internacionales (out of scope MVP, formula paridad)
//   93 = DEVOLUCION Nacional
//   94 = CASILLERO Nacional Devolucional
export const WITH_FREIGHT_CODES = new Set<number>([21, 41, 43, 75, 76]);
export const FLAT_CODES = new Set<number>([17, 18, 50, 90, 93, 94, 102]);
