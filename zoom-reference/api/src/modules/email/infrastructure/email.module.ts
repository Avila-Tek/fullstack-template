import { Module } from '@nestjs/common';
import { EmailServicePort } from '../application/ports/out/email.service.port';
import { ZoomAuthService } from './zoom-auth.service';
import { ZoomEmailAdapter } from './zoom-email.adapter';

@Module({
	providers: [
		ZoomAuthService,
		{
			provide: EmailServicePort,
			useClass: ZoomEmailAdapter,
		},
	],
	exports: [EmailServicePort],
})
export class EmailModule {}
