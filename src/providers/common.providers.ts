import { AuthModule } from '@common/auth';
import { ConfigModule } from '@nestjs/config';

export const CommonProviders = [
  // Инфраструктурные и внешние модули
  AuthModule,
  ConfigModule.forRoot({
    isGlobal: true,
  }),
];
