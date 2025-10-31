import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupLogsTask } from './tasks/cleanup-logs.task';
import { PostgresqlModule } from '@common/database/postgresql/postgresql.module';

@Module({
  imports: [ScheduleModule.forRoot(), PostgresqlModule],
  providers: [CleanupLogsTask],
})
export class LogsSchedulerModule {}
