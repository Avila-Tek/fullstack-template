import type { IncomingMessage } from 'node:http';
import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
	Query,
	Req,
	Res,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import {
	grantSystemAccessBody,
	grantSystemAccessResponse,
	paginationInput,
	systemMemberItem,
	updateMemberRoleBody,
} from '@zoom/schemas';
import {
	ApiErrorResponses,
	ApiPaginatedResponse,
	ApiSafeResponse,
	ApiZodBody,
	ApiZodQuery,
} from '@zoom/swagger';
import { fromNodeHeaders } from 'better-auth/node';
import type { Response } from 'express';
import type { GrantSystemAccessData } from '../../application/ports/in/grant-system-access.use-case.port';
import { GrantSystemAccessUseCasePort } from '../../application/ports/in/grant-system-access.use-case.port';
import type { ListSystemMembersData } from '../../application/ports/in/list-system-members.use-case.port';
import { ListSystemMembersUseCasePort } from '../../application/ports/in/list-system-members.use-case.port';
import { RevokeSystemAccessUseCasePort } from '../../application/ports/in/revoke-system-access.use-case.port';
import { UpdateMemberRoleUseCasePort } from '../../application/ports/in/update-member-role.use-case.port';
import type { System } from '../../domain/entities/system.entity';
import { resolveClientIpFromRequest } from '../../shared/utils/resolve-client-ip';
import { SystemAdminGuard } from '../guards/system-admin.guard';

type SessionData = { user: { id: string } } | null;
type RequestWithResolved = IncomingMessage & {
	resolvedSystem: System;
	[key: string]: unknown;
};

@ApiTags('System Members')
@Controller('systems/:id/members')
@UseGuards(SystemAdminGuard)
export class SystemMembersController {
	constructor(
		private readonly grantAccessUseCase: GrantSystemAccessUseCasePort,
		private readonly listMembersUseCase: ListSystemMembersUseCasePort,
		private readonly revokeAccessUseCase: RevokeSystemAccessUseCasePort,
		private readonly updateRoleUseCase: UpdateMemberRoleUseCasePort,
	) {}

	@Post()
	@HttpCode(200)
	@ApiOperation({
		summary: 'Grant a user access to a restricted system',
		description:
			'Grants access to an existing user (200) or provisions a new account (201). ' +
			'Idempotent — returns the existing membership if the user is already a member.',
	})
	@ApiParam({ name: 'id', description: 'System ID', type: String })
	@ApiZodBody(grantSystemAccessBody, 'Grant access payload')
	@ApiSafeResponse(
		grantSystemAccessResponse,
		200,
		'User already a member (existing path)',
	)
	@ApiResponse({
		status: 201,
		description: 'New account provisioned (provisioned path)',
	})
	@ApiErrorResponses(400, 401, 403, 404)
	async grantAccess(
		@Session() session: SessionData,
		@Param('id') systemId: string,
		@Body() body: unknown,
		@Req() req: RequestWithResolved,
		@Res({ passthrough: true }) res: Response,
	): Promise<GrantSystemAccessData> {
		const callerUserId = session?.user?.id;
		if (!callerUserId) throw new UnauthorizedException();

		const parsed = grantSystemAccessBody.safeParse(body);
		if (!parsed.success)
			throw new BadRequestException(parsed.error.flatten().fieldErrors);

		const result = await this.grantAccessUseCase.execute({
			systemId,
			callerUserId,
			email: parsed.data.email,
			role: parsed.data.role,
			ipAddress: resolveClientIpFromRequest(req),
			userAgent: req.headers['user-agent'] ?? 'unknown',
		});

		if (!result.success) throw result.error;

		if (result.data.path === 'provisioned') {
			res.status(201);
		}

		return result.data;
	}

	@Get()
	@ApiOperation({ summary: 'List members of a restricted system (paginated)' })
	@ApiParam({ name: 'id', description: 'System ID', type: String })
	@ApiZodQuery(paginationInput.shape)
	@ApiPaginatedResponse(systemMemberItem, 'Paginated list of system members')
	@ApiErrorResponses(400, 401, 403, 404)
	async listMembers(
		@Param('id') systemId: string,
		@Query() query: unknown,
	): Promise<ListSystemMembersData> {
		const parsedPagination = paginationInput.safeParse(query);
		if (!parsedPagination.success)
			throw new BadRequestException(
				parsedPagination.error.flatten().fieldErrors,
			);
		const pagination = parsedPagination.data;

		const result = await this.listMembersUseCase.execute({
			systemId,
			pagination,
		});

		if (!result.success) throw result.error;
		return result.data;
	}

	@Delete(':userId')
	@HttpCode(200)
	@ApiOperation({ summary: "Revoke a user's access to a restricted system" })
	@ApiParam({ name: 'id', description: 'System ID', type: String })
	@ApiParam({
		name: 'userId',
		description: 'ID of the user to revoke access from',
		type: String,
	})
	@ApiResponse({ status: 200, description: 'Access revoked' })
	@ApiErrorResponses(401, 403, 404)
	async revokeAccess(
		@Session() session: SessionData,
		@Param('id') systemId: string,
		@Param('userId') targetUserId: string,
		@Req() req: RequestWithResolved,
	): Promise<void> {
		const callerUserId = session?.user?.id;
		if (!callerUserId) throw new UnauthorizedException();

		const { organizationId } = req.resolvedSystem;

		const result = await this.revokeAccessUseCase.execute({
			systemId,
			organizationId,
			callerUserId,
			targetUserId,
			ipAddress: resolveClientIpFromRequest(req),
			userAgent: req.headers['user-agent'] ?? 'unknown',
			headers: fromNodeHeaders(req.headers),
		});

		if (!result.success) throw result.error;
	}

	@Patch(':userId')
	@HttpCode(200)
	@ApiOperation({ summary: 'Update the role of a system member' })
	@ApiParam({ name: 'id', description: 'System ID', type: String })
	@ApiParam({
		name: 'userId',
		description: 'ID of the member whose role to update',
		type: String,
	})
	@ApiZodBody(updateMemberRoleBody, 'Role update payload')
	@ApiResponse({ status: 200, description: 'Role updated' })
	@ApiErrorResponses(400, 401, 403, 404)
	async updateRole(
		@Session() session: SessionData,
		@Param('id') systemId: string,
		@Param('userId') targetUserId: string,
		@Body() body: unknown,
		@Req() req: RequestWithResolved,
	): Promise<void> {
		const callerUserId = session?.user?.id;
		if (!callerUserId) throw new UnauthorizedException();

		const parsed = updateMemberRoleBody.safeParse(body);
		if (!parsed.success)
			throw new BadRequestException(parsed.error.flatten().fieldErrors);
		const { organizationId } = req.resolvedSystem;

		const result = await this.updateRoleUseCase.execute({
			systemId,
			organizationId,
			callerUserId,
			targetUserId,
			role: parsed.data.role,
			ipAddress: resolveClientIpFromRequest(req),
			userAgent: req.headers['user-agent'] ?? 'unknown',
			headers: fromNodeHeaders(req.headers),
		});

		if (!result.success) throw result.error;
	}
}
