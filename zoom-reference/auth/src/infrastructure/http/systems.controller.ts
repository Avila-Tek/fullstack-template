import type { IncomingMessage } from 'node:http';
import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	NotFoundException,
	Param,
	Patch,
	Post,
	Req,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import { ApiErrorResponses, ApiSafeResponse, ApiZodBody } from '@zoom/swagger';
import { z } from 'zod';
import { DeactivateSystemUseCasePort } from '../../application/ports/in/deactivate-system.use-case.port';
import { GetSystemUseCasePort } from '../../application/ports/in/get-system.use-case.port';
import { ListSystemsUseCasePort } from '../../application/ports/in/list-systems.use-case.port';
import {
	type RegisterSystemData,
	RegisterSystemUseCasePort,
} from '../../application/ports/in/register-system.use-case.port';
import {
	type RotateSystemKeyData,
	RotateSystemKeyUseCasePort,
} from '../../application/ports/in/rotate-system-key.use-case.port';
import { UpdateSystemUseCasePort } from '../../application/ports/in/update-system.use-case.port';
import type { System } from '../../domain/entities/system.entity';
import { resolveClientIpFromRequest } from '../../shared/utils/resolve-client-ip';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';

type SessionData = { user: { id: string } } | null;

const registerSystemBody = z.object({
	name: z.string().min(1).max(120),
	slug: z
		.string()
		.min(1)
		.max(120)
		.regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
	apiBaseUrl: z.string().max(2048),
	accessModel: z.enum(['open', 'restricted']),
});

const updateSystemBody = z.object({
	name: z.string().min(1).max(120).optional(),
	slug: z
		.string()
		.min(1)
		.max(120)
		.regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens')
		.optional(),
	apiBaseUrl: z.string().max(2048).optional(),
	accessModel: z.enum(['open', 'restricted']).optional(),
});

const registerSystemResponse = z.object({
	systemId: z.string().uuid(),
	rawApiKey: z.string().length(64),
	keyPrefix: z.string().length(8),
});

const rotateKeyResponse = z.object({
	rawApiKey: z.string().length(64),
	keyPrefix: z.string().length(8),
});

const systemResponse = z.object({
	id: z.string().uuid(),
	name: z.string(),
	slug: z.string(),
	apiBaseUrl: z.string(),
	accessModel: z.enum(['open', 'restricted']),
	organizationId: z.string(),
	status: z.enum(['active', 'suspended']),
	createdAt: z.date(),
	updatedAt: z.date(),
});

// Spec §E-002-S-010: platform-admin only endpoints to manage registered systems.
// Protected by PlatformAdminGuard (session-based) — excluded from SystemKeyMiddleware.
@ApiTags('Systems')
@Controller('systems')
@UseGuards(PlatformAdminGuard)
export class SystemsController {
	constructor(
		private readonly registerSystem: RegisterSystemUseCasePort,
		private readonly listSystemsUseCase: ListSystemsUseCasePort,
		private readonly getSystemUseCase: GetSystemUseCasePort,
		private readonly updateSystemUseCase: UpdateSystemUseCasePort,
		private readonly rotateSystemKeyUseCase: RotateSystemKeyUseCasePort,
		private readonly deactivateSystemUseCase: DeactivateSystemUseCasePort,
	) {}

	@Post()
	@HttpCode(201)
	@ApiOperation({
		summary: 'Register a new system (platform admin only)',
		description:
			'Creates a new consuming application in the IdP, generates a Better Auth ' +
			'organization, and returns a one-time raw API key. ' +
			'The raw key is never stored — save it immediately.',
	})
	@ApiZodBody(registerSystemBody, 'System registration payload')
	@ApiSafeResponse(
		registerSystemResponse,
		201,
		'System registered successfully',
	)
	@ApiErrorResponses(400, 401, 403, 409, 422)
	async register(
		@Session() session: SessionData,
		@Body() body: unknown,
		@Req() req: IncomingMessage,
	): Promise<RegisterSystemData> {
		const userId = session?.user?.id;
		if (!userId) throw new UnauthorizedException();

		const parsed = registerSystemBody.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.flatten().fieldErrors);
		}

		const result = await this.registerSystem.execute({
			platformAdminUserId: userId,
			name: parsed.data.name,
			slug: parsed.data.slug,
			apiBaseUrl: parsed.data.apiBaseUrl,
			accessModel: parsed.data.accessModel,
			ipAddress: resolveClientIpFromRequest(req),
			userAgent: req.headers['user-agent'] ?? 'unknown',
		});

		if (!result.success) throw result.error;

		return result.data;
	}

	@Get()
	@ApiOperation({
		summary: 'List all registered systems (platform admin only)',
	})
	@ApiSafeResponse(z.array(systemResponse), 200, 'List of systems')
	@ApiErrorResponses(401, 403)
	async list(): Promise<System[]> {
		const result = await this.listSystemsUseCase.execute();
		if (!result.success) return [];
		return result.data;
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a system by ID (platform admin only)' })
	@ApiSafeResponse(systemResponse, 200, 'System details')
	@ApiErrorResponses(401, 403, 404)
	async getById(@Param('id') id: string): Promise<System> {
		const result = await this.getSystemUseCase.execute(id);
		if (!result.success) throw new NotFoundException();
		return result.data;
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update a system (platform admin only)' })
	@ApiZodBody(updateSystemBody, 'Fields to update (all optional)')
	@ApiSafeResponse(systemResponse, 200, 'Updated system')
	@ApiErrorResponses(400, 401, 403, 404, 409, 422)
	async update(
		@Session() session: SessionData,
		@Param('id') id: string,
		@Body() body: unknown,
		@Req() req: IncomingMessage,
	): Promise<System> {
		const userId = session?.user?.id;
		if (!userId) throw new UnauthorizedException();

		const parsed = updateSystemBody.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.flatten().fieldErrors);
		}

		const result = await this.updateSystemUseCase.execute({
			systemId: id,
			platformAdminUserId: userId,
			...parsed.data,
			ipAddress: resolveClientIpFromRequest(req),
			userAgent: req.headers['user-agent'] ?? 'unknown',
		});

		if (!result.success) throw result.error;
		return result.data;
	}

	@Post(':id/rotate-key')
	@HttpCode(200)
	@ApiOperation({
		summary: 'Rotate the API key for a system (platform admin only)',
		description:
			'Atomically revokes the current active API key and issues a new one. ' +
			'The new raw key is returned exactly once — save it immediately.',
	})
	@ApiSafeResponse(rotateKeyResponse, 200, 'New API key issued')
	@ApiErrorResponses(401, 403, 404)
	async rotateKey(
		@Session() session: SessionData,
		@Param('id') id: string,
		@Req() req: IncomingMessage,
	): Promise<RotateSystemKeyData> {
		const userId = session?.user?.id;
		if (!userId) throw new UnauthorizedException();

		const result = await this.rotateSystemKeyUseCase.execute({
			systemId: id,
			platformAdminUserId: userId,
			ipAddress: resolveClientIpFromRequest(req),
			userAgent: req.headers['user-agent'] ?? 'unknown',
		});

		if (!result.success) throw result.error;
		return result.data;
	}

	@Delete(':id')
	@HttpCode(204)
	@ApiOperation({
		summary: 'Deactivate (soft-delete) a system (platform admin only)',
	})
	@ApiErrorResponses(401, 403, 404)
	async deactivate(
		@Session() session: SessionData,
		@Param('id') id: string,
		@Req() req: IncomingMessage,
	): Promise<void> {
		const userId = session?.user?.id;
		if (!userId) throw new UnauthorizedException();

		const result = await this.deactivateSystemUseCase.execute({
			systemId: id,
			platformAdminUserId: userId,
			ipAddress: resolveClientIpFromRequest(req),
			userAgent: req.headers['user-agent'] ?? 'unknown',
		});

		if (!result.success) throw result.error;
	}
}
