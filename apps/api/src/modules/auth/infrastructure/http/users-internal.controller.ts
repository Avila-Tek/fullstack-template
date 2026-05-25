import {
	Body,
	Controller,
	HttpCode,
	Inject,
	Post,
	UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import {
	provisionUserCommandSchema,
	provisionUserOutputSchema,
	type TProvisionUserOutput,
} from '@zoom/schemas';
import {
	ApiErrorResponses,
	ApiSafeResponse,
	ApiZodBody,
	createZodDto,
} from '@zoom/swagger';
import { ProvisionUserUseCasePort } from '../../application/ports/in/provision-user.use-case.port';
import { InternalServiceGuard } from '../guards/internal-service.guard';

class ProvisionUserBodyDto extends createZodDto(provisionUserCommandSchema) {}

@ApiTags('Users (Internal)')
@Controller('internal/users')
@AllowAnonymous()
@UseGuards(InternalServiceGuard)
export class UsersInternalController {
	constructor(
		@Inject(ProvisionUserUseCasePort)
		private readonly provisionUseCase: ProvisionUserUseCasePort,
	) {}

	@Post('provision')
	@HttpCode(200)
	@ApiOperation({
		summary: 'Provision an auth user by email',
		description:
			'Returns the userId for an existing user (path=existing) or creates a ' +
			'new provisioned account with a random password (path=provisioned). ' +
			'Guarded by x-service-secret — internal use only.',
	})
	@ApiZodBody(provisionUserCommandSchema)
	@ApiSafeResponse(provisionUserOutputSchema, 200)
	@ApiErrorResponses(400, 403, 500)
	provision(@Body() body: ProvisionUserBodyDto): Promise<TProvisionUserOutput> {
		return this.provisionUseCase.execute(body.email);
	}
}
