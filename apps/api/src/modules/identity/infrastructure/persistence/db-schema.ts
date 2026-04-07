// Single aggregation point for the identity module's Drizzle schema.
// Used in: better-auth singleton (runtime) and drizzle config (migrations).
// Not a barrel re-export — do not import individual table types from here.

export { account } from './schema/account.schema';
export { device } from './schema/device.schema';
export { emailChangeVerification } from './schema/email-change-verification.schema';
export { jwks } from './schema/jwks.schema';
export { loginAuditLog } from './schema/login-audit-log.schema';
export { passwordHistory } from './schema/password-history.schema';
export { rateLimit } from './schema/rate-limit.schema';
export { session } from './schema/session.schema';
export {
	signupAuditLog,
	signupEventTypeEnum,
} from './schema/signup-audit-log.schema';
export { twoFactor } from './schema/two-factor.schema';
export { user } from './schema/user.schema';
export { verification } from './schema/verification.schema';
