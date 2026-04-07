import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ApiSafeResponse } from '@/shared/swagger/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get()
	@ApiOperation({
		summary: 'Health check',
		description:
			'Returns a simple string confirming the API is reachable. No authentication required.',
	})
	@ApiSafeResponse(z.string(), 200, 'Health check response')
	getHello(): { success: true; data: string } {
		return { success: true, data: this.appService.getHello() };
	}
}
