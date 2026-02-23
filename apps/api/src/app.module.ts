import { Module } from '@nestjs/common';
import { UsersModule } from './modules/user/module';
import { AuthModule } from './modules/auth/module';
import { BusModule } from './bus.module';
import { SecurityModule } from './security.module';
import { DrizzleModule } from './infrastructure/database/drizzle.module';

@Module({
  imports: [DrizzleModule, UsersModule, AuthModule, BusModule, SecurityModule],
  controllers: [],
})
export class AppModule {}
