import { Module } from '@nestjs/common';
import { repositoriesExport } from './repositories';
import { PostgresqlService } from './postgresql.service';

@Module({
  providers: [PostgresqlService, ...repositoriesExport],
  exports: [...repositoriesExport],
})
export class PostgresqlModule {}
