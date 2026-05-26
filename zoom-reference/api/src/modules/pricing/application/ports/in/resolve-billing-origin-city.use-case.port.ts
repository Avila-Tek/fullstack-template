export abstract class ResolveBillingOriginCityUseCasePort {
	abstract execute(args: { userId: string }): Promise<string>;
}
