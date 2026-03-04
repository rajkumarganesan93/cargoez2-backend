import { Module } from '@nestjs/common';
import { DatabaseModule } from '@cargoez/shared';
import { AuthModule, RealtimeModule } from '@cargoez/infrastructure';
import { UsersModule } from './users/users.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    DatabaseModule.forRoot(),
    AuthModule,
    RealtimeModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
