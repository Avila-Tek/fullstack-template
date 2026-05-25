// Single aggregation point for the Drizzle schema object.
// Used in two places only: drizzle.module.ts (runtime) and drizzle.config.ts (migrations).
// Not a barrel re-export — do not import individual table types from here.

export { account } from './schema/account.schema';
export { device } from './schema/device.schema';
export { invitation } from './schema/invitation.schema';
export { jwks } from './schema/jwks.schema';
export { loginAuditLog } from './schema/login-audit-log.schema';
export { member } from './schema/member.schema';
export { organization } from './schema/organization.schema';
export { passwordHistory } from './schema/password-history.schema';
export { rateLimit } from './schema/rate-limit.schema';
export { securityAuditLog } from './schema/security-audit-log.schema';
export { session } from './schema/session.schema';
export {
	sessionAuditLog,
	sessionEventTypeEnum,
} from './schema/session-audit-log.schema';
export {
	signupAuditLog,
	signupEventTypeEnum,
} from './schema/signup-audit-log.schema';
export {
	system,
	systemAccessModelEnum,
	systemStatusEnum,
} from './schema/system.schema';
export { systemApiKey } from './schema/system-api-key.schema';
export {
	systemMemberRoleEnum,
	systemMembership,
	systemMembershipStatusEnum,
} from './schema/system-membership.schema';
export {
	systemTerms,
	termsStatusEnum,
} from './schema/system-terms.schema';
export { twoFactor } from './schema/two-factor.schema';
export {
	twoFactorAuditLog,
	twoFactorEventTypeEnum,
} from './schema/two-factor-audit-log.schema';
export { user } from './schema/user.schema';
export { userTermsAcceptance } from './schema/user-terms-acceptance.schema';
export {
	twoFactorMethodsEnum,
	userTwoFactor,
} from './schema/user-two-factor.schema';
export { verification } from './schema/verification.schema';
