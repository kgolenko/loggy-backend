import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import {
  CONFIG__JWT_ACCESS_TOKEN_EXPIRATION_TIME,
  CONFIG__JWT_ACCESS_TOKEN_SECRET,
} from '@shared/constants';
import { PostgresqlModule } from '@common/database/postgresql/postgresql.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy, JwtRefreshStrategy } from './strategies';
import { JwtAuthGuard, JwtRefreshGuard } from './guards';

@Module({
  imports: [
    PassportModule,
    PostgresqlModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.getOrThrow(CONFIG__JWT_ACCESS_TOKEN_SECRET),
        signOptions: {
          expiresIn: configService.getOrThrow(
            CONFIG__JWT_ACCESS_TOKEN_EXPIRATION_TIME,
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ConfigService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    JwtRefreshGuard,
  ],
  exports: [JwtModule, JwtAuthGuard, AuthService],
})
export class AuthModule {}
