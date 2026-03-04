import { Module } from '@nestjs/common';
import { DatabaseModule } from '@cargoez/shared';
import { AuthModule, RealtimeModule } from '@cargoez/infrastructure';
import { UsersModule } from './presentation/users.module';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    DatabaseModule.forRoot({ connectionPrefix: 'USER_SERVICE' }),
    AuthModule,
    RealtimeModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
