import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { context, propagation } from '@opentelemetry/api';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

type MinimalReq = {
  headers: Record<string, string | string[] | undefined>;
  correlationId?: string;
};
type MinimalRes = { header(k: string, v: string): unknown };

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: MinimalReq, res: MinimalRes, next: () => void): void {
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string | undefined) ?? randomUUID();

    req.correlationId = correlationId;
    res.header(CORRELATION_ID_HEADER, correlationId);

    // Propagate as OTel baggage so downstream spans inherit it
    const active = context.active();
    const baggage =
      propagation.getBaggage(active) ?? propagation.createBaggage();
    const newBaggage = baggage.setEntry('correlation.id', { value: correlationId });
    context.with(propagation.setBaggage(active, newBaggage), next);
  }
}
