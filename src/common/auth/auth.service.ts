import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {
  CONFIG__JWT_ACCESS_TOKEN_EXPIRATION_TIME,
  CONFIG__JWT_REFRESH_TOKEN_SECRET,
  CONFIG__JWT_REFRESH_TOKEN_EXPIRATION_TIME,
} from '@shared/constants';
import { UserRepository } from '@common/database/postgresql/repositories/user';
import { RefreshTokenRepository } from '@common/database/postgresql/repositories/refresh-token';
import { LoginDto, RegisterDto } from './dto';
import { AuthResponse, JwtPayload } from './interfaces';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password } = registerDto;

    const userExists = await this.userRepository.existsByEmail(email);
    if (userExists) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userRepository.create({
      email,
      password: hashedPassword,
      isActive: true,
    });

    const tokens = await this.generateTokens(user.id, user.email);

    await this.refreshTokenRepository.create({
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: this.getRefreshTokenExpiration(),
      isRevoked: false,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findUnique({ email });

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Аккаунт деактивирован');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    await this.refreshTokenRepository.revokeAllUserTokens(user.id);

    await this.refreshTokenRepository.create({
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: this.getRefreshTokenExpiration(),
      isRevoked: false,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const tokenRecord =
        await this.refreshTokenRepository.findByToken(refreshToken);

      if (!tokenRecord) {
        throw new UnauthorizedException('Refresh token не найден');
      }

      if (tokenRecord.isRevoked) {
        throw new UnauthorizedException('Refresh token отозван');
      }

      if (tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token истек');
      }

      const refreshSecret = this.configService.getOrThrow<string>(
        CONFIG__JWT_REFRESH_TOKEN_SECRET,
      );
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: refreshSecret,
        },
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Неверный тип токена');
      }

      const user = await this.userRepository.findUnique({ id: payload.sub });

      if (!user || !user.isActive) {
        throw new UnauthorizedException(
          'Пользователь не найден или деактивирован',
        );
      }

      await this.refreshTokenRepository.revokeToken(refreshToken);

      const tokens = await this.generateTokens(user.id, user.email);

      await this.refreshTokenRepository.create({
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: this.getRefreshTokenExpiration(),
        isRevoked: false,
      });

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          isActive: user.isActive,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Неверный refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenRecord =
      await this.refreshTokenRepository.findByToken(refreshToken);

    if (tokenRecord) {
      await this.refreshTokenRepository.revokeToken(refreshToken);
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: Record<string, any> = {
      sub: userId,
      email,
      type: 'access',
    };

    const refreshPayload: Record<string, any> = {
      sub: userId,
      email,
      type: 'refresh',
    };

    const refreshSecret = this.configService.getOrThrow<string>(
      CONFIG__JWT_REFRESH_TOKEN_SECRET,
    );
    const refreshExpiration = this.configService.getOrThrow<string>(
      CONFIG__JWT_REFRESH_TOKEN_EXPIRATION_TIME,
    );

    const accessExpiration = this.configService.getOrThrow<string>(
      CONFIG__JWT_ACCESS_TOKEN_EXPIRATION_TIME,
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: accessExpiration,
      } as any),
      new Promise<string>((resolve, reject) => {
        jwt.sign(
          refreshPayload,
          refreshSecret,
          { expiresIn: refreshExpiration } as jwt.SignOptions,
          (err, token) => {
            if (err) reject(err);
            else resolve(token as string);
          },
        );
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private getRefreshTokenExpiration(): Date {
    const expirationTime = this.configService.getOrThrow<string>(
      CONFIG__JWT_REFRESH_TOKEN_EXPIRATION_TIME,
    );
    const now = new Date();
    const expirationDate = new Date(now);

    if (expirationTime.endsWith('d')) {
      const days = parseInt(expirationTime.replace('d', ''), 10);
      expirationDate.setDate(now.getDate() + days);
    } else if (expirationTime.endsWith('h')) {
      const hours = parseInt(expirationTime.replace('h', ''), 10);
      expirationDate.setHours(now.getHours() + hours);
    } else if (expirationTime.endsWith('m')) {
      const minutes = parseInt(expirationTime.replace('m', ''), 10);
      expirationDate.setMinutes(now.getMinutes() + minutes);
    } else {
      expirationDate.setDate(now.getDate() + 7);
    }

    return expirationDate;
  }
}
