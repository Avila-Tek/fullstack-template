import type { TValidateLockerQuery } from '@zoom/schemas';
import type { LockerFailureCode } from '../../../domain/types/locker-failure-code';

export type ValidateLockerResult =
	| { valid: false; failureCode: LockerFailureCode }
	| {
			valid: true;
			lockerId: string;
			lockerCode: number;
			siglas: string;
			contactName: string | null;
			shippingServiceId: string;
			serviceCode: number;
			serviceName: string;
			officeId: string;
			// LEGACY: `oficina.codoficina`. Consumed by VS3 as
			// `destinationOfficeLegacyId` when calling `resolveWeightTypeCode`.
			officeLegacyId: number;
			officeName: string;
			cityId: string;
			cityName: string;
			cityTransportChargeRuleId: string | null;
	  };

export abstract class ValidateLockerUseCasePort {
	abstract execute(query: TValidateLockerQuery): Promise<ValidateLockerResult>;
}
