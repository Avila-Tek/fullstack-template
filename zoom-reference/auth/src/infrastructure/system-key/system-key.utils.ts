import type {
	SystemKeyPort,
	SystemKeyResolution,
} from '../../application/ports/out/system-key-service.port';

export type SystemKeyValidationResult =
	| { ok: true; resolution: SystemKeyResolution }
	| { ok: false; error: 'missing_system_key' | 'invalid_system_key' }
	| { ok: false; error: 'system_inactive'; systemId: string };

export function extractSystemKey(
	getHeader: (name: string) => string | undefined,
): string {
	return getHeader('x-system-key')?.trim() ?? '';
}

export async function resolveAndValidateSystemKey(
	key: string,
	service: Pick<SystemKeyPort, 'resolveSystemId'>,
): Promise<SystemKeyValidationResult> {
	if (!key) return { ok: false, error: 'missing_system_key' };

	const resolution = await service.resolveSystemId(key);
	if (!resolution) return { ok: false, error: 'invalid_system_key' };
	if (resolution.status === 'suspended') {
		return {
			ok: false,
			error: 'system_inactive',
			systemId: resolution.systemId,
		};
	}

	return { ok: true, resolution };
}
