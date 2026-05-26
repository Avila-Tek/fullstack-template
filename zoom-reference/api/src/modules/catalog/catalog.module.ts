import { Module } from '@nestjs/common';
import { CatalogReaderPort } from '../pricing/application/ports/out/catalog-reader.port';
import { CatalogReaderAdapter } from './infrastructure/adapters/catalog-reader.adapter';

/**
 * Catalog module — read-only consumer module per `docs/api_modules.md` Module 8.
 *
 * Owns `transit_matrix` (added in F1.6). Future stories will fold
 * `shipping_service_master`, `office_master`, `locker_master`, `route_master`
 * into this module, but those existing schemas stay where they are for now.
 *
 * Exports `CatalogReaderPort` (the abstract class is defined in the pricing
 * module — pricing is the consumer; catalog is the producer per the rule-2
 * cross-module convention in `apps/api/CLAUDE.md`).
 */
@Module({
	providers: [{ provide: CatalogReaderPort, useClass: CatalogReaderAdapter }],
	exports: [CatalogReaderPort],
})
export class CatalogModule {}
