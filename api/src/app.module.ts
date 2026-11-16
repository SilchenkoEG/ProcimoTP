import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { ClockModule } from './common/clock.js';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';
import { CourtsModule } from './courts/courts.module.js';
import { createValidationPipe } from './common/validation.js';
import { buildDataSourceOptions, DEFAULT_DATABASE_URL } from './database/typeorm.config.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildDataSourceOptions(config.get<string>('DATABASE_URL') ?? DEFAULT_DATABASE_URL),
    }),
    ClockModule,
    AuthModule,
    CourtsModule,
  ],
  controllers: [HealthController],
  // Registered as providers (not in main.ts) so integration tests that build
  // AppModule get exactly the same validation and error format.
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
