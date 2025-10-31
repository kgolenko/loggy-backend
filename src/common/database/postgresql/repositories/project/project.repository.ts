import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, Project } from '@prisma/client';
import { BaseRepository } from '@shared/abstract/base.service';
import { PostgresqlService } from '../../postgresql.service';

@Injectable()
export class ProjectRepository extends BaseRepository<
  Prisma.ProjectDelegate,
  Project
> {
  constructor(prisma: PostgresqlService) {
    super(prisma, prisma.project);
  }

  async findByToken(token: string) {
    return await this.delegate.findUnique({
      where: { token },
    });
  }

  async findByUserId(userId: string) {
    return await this.delegate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserIdAndId(userId: string, id: string) {
    return await this.delegate.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  async regenerateToken(id: string): Promise<Project> {
    const newToken = randomUUID();

    return await this.delegate.update({
      where: { id },
      data: {
        token: newToken,
      },
    });
  }
}
