import { Module } from '@nestjs/common';
import { DatabaseModule } from '@cargoez/shared';
import { AuthModule, RealtimeModule } from '@cargoez/infrastructure';
import { CountriesModule } from './countries/countries.module';
import { HealthController } from './health.controller';

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
