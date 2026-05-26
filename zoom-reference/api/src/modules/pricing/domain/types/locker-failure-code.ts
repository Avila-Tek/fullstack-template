// Internal-only union used by ValidateLockerResult for logging / observability.
// These codes NEVER cross the HTTP boundary — the validate endpoint collapses
// every failure to `{ valid: false }` and the pricing use case throws the
// single PRICING_LOCKER_INVALID catch-all.
export type LockerFailureCode =
	| 'NOT_FOUND'
	| 'LOCKER_INACTIVE'
	| 'CLIENT_INACTIVE'
	| 'OFFICE_NOT_CONFIGURED'
	| 'INTERNATIONAL_FAMILY';
