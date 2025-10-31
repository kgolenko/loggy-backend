import { Injectable } from '@nestjs/common';
import { Prisma, RefreshToken } from '@prisma/client';
import { BaseRepository } from '@shared/abstract/base.service';
import { PostgresqlService } from '../../postgresql.service';

@Injectable()
export class RefreshTokenRepository extends BaseRepository<
  Prisma.RefreshTokenDelegate,
  RefreshToken
> {
  constructor(prisma: PostgresqlService) {
    super(prisma, prisma.refreshToken);
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return await this.delegate.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async revokeToken(token: string): Promise<RefreshToken> {
    return await this.delegate.update({
      where: { token },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.delegate.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async deleteExpiredTokens(): Promise<number> {
    const result = await this.delegate.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }
}
