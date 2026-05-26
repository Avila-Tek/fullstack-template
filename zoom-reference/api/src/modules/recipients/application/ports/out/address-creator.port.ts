import type { NewAddressProps } from '../../../../profiles/application/ports/out/address-repository.port';

export abstract class AddressCreatorPort {
	abstract create(data: NewAddressProps): Promise<{ id: string }>;
}
