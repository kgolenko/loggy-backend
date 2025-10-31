import { Module } from '@nestjs/common';
import { CommonProviders } from './providers/common.providers';
import { GatewayModule } from '@domain/gateway/gateway.module';
import { ProjectsModule } from '@domain/projects/projects.module';
import { LogsModule } from '@domain/logs/logs.module';
import { RealtimeModule } from '@domain/realtime/realtime.module';
import { LogsSchedulerModule } from '@domain/logs/scheduler.module';

@Module({
  imports: [
    GatewayModule,
    ProjectsModule,
    LogsModule,
    RealtimeModule,
    LogsSchedulerModule,
    ...CommonProviders,
  ],
  providers: [],
})
export class AppModule {}
