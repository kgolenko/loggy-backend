import { Module } from '@nestjs/common';
import { CommonProviders } from './providers/common.providers';
import { GatewayModule } from '@domain/gateway/gateway.module';

@Module({
  imports: [GatewayModule, ...CommonProviders],
  providers: [],
})
export class AppModule {}
