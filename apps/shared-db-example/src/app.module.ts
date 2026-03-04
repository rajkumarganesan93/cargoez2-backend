import { Module } from '@nestjs/common';
import { DatabaseModule } from '@cargoez/shared';
import { AuthModule, RealtimeModule } from '@cargoez/infrastructure';
import { CountriesModule } from './presentation/countries.module';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    DatabaseModule.forRoot(),
    AuthModule,
    RealtimeModule,
    CountriesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
