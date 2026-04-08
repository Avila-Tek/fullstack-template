// Single aggregation point for the identity module's Drizzle schema.
// Used in: better-auth singleton (runtime) and drizzle config (migrations).
// Not a barrel re-export — do not import individual table types from here.

export { account } from './schemas/account.schema';
export { device } from './schemas/device.schema';
export { emailChangeVerification } from './schemas/email-change-verification.schema';
export { jwks } from './schemas/jwks.schema';
export { loginAuditLog } from './schemas/login-audit-log.schema';
export { passwordHistory } from './schemas/password-history.schema';
export { session } from './schemas/session.schema';
export {
	signupAuditLog,
	signupEventTypeEnum,
} from './schemas/signup-audit-log.schema';
export { twoFactor } from './schemas/two-factor.schema';
export { user } from './schemas/user.schema';
export { verification } from './schemas/verification.schema';
