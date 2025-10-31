import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { PostgresqlModule } from '@common/database/postgresql/postgresql.module';
import { AuthModule } from '@common/auth/auth.module';

@Module({
  imports: [PostgresqlModule, AuthModule],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
