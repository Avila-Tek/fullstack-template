import { Module } from "@nestjs/common";
import { UsersModule } from "./modules/user/module";
import { AuthModule } from "./modules/auth/module";
import { BusModule } from "./bus.module";

@Module({
  imports: [UsersModule, AuthModule, BusModule],
  controllers: [],
})
export class AppModule {}
