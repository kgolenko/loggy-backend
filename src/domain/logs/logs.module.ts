import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogsController, ProjectLogsController } from './logs.controller';
import { PostgresqlModule } from '@common/database/postgresql/postgresql.module';
import { ProjectTokenGuard } from './guards';

@Module({
  imports: [PostgresqlModule],
  controllers: [LogsController, ProjectLogsController],
  providers: [LogsService, ProjectTokenGuard],
  exports: [LogsService],
})
export class LogsModule {}
