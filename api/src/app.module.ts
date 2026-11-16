import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions, DEFAULT_DATABASE_URL } from './database/typeorm.config.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildTypeOrmOptions(config.get<string>('DATABASE_URL') ?? DEFAULT_DATABASE_URL),
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
