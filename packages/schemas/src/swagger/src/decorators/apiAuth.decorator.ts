import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ApiErrorResponses } from './apiErrorResponses.decorator';

/**
 * Marks an endpoint as protected by a Bearer JWT session.
 * Combines @ApiBearerAuth() with standard 401 and 429 error responses.
 * Use on every protected endpoint in apps/api and apps/auth.
 */
export function ApiBearerSession(): MethodDecorator {
  return applyDecorators(ApiBearerAuth(), ApiErrorResponses(401, 429));
}

/**
 * Marks an endpoint as protected by the X-Service-Secret header.
 * Combines @ApiSecurity('service-secret') with standard 401 and 429 error responses.
 * Use on orchestrator endpoints protected by ServiceAuthGuard.
 */
export function ApiServiceKey(): MethodDecorator {
  return applyDecorators(
    ApiSecurity('service-secret'),
    ApiErrorResponses(401, 429)
  );
}
