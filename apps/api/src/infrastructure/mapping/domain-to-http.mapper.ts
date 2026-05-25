import { HttpStatus } from '@nestjs/common';

// Add domain-error-code → HTTP-status mappings here.
// AUTH_* codes are added in F2.
const statusMap: Record<string, number> = {};

export function domainToHttpStatus(error: string): number {
  return statusMap[error] ?? HttpStatus.UNPROCESSABLE_ENTITY;
}
