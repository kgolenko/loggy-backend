import { AuthModule } from '@common/auth';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

export const CommonProviders = [
  // Инфраструктурные и внешние модули
  AuthModule,
  ConfigModule.forRoot({
    isGlobal: true,
  }),
  EventEmitterModule.forRoot(),
];
