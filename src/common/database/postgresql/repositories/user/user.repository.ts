import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { BaseRepository } from '@shared/abstract/base.service';
import { PostgresqlService } from '../../postgresql.service';

@Injectable()
export class UserRepository extends BaseRepository<Prisma.UserDelegate, User> {
  constructor(prisma: PostgresqlService) {
    super(prisma, prisma.user);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.delegate.findUnique({
      where: { email },
      select: { id: true },
    });

    return user !== null;
  }

  async activate(id: string): Promise<User> {
    return await this.delegate.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deactivate(id: string): Promise<User> {
    return await this.delegate.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
