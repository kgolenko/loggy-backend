import { Injectable } from '@nestjs/common';
import { Prisma, Log, $Enums } from '@prisma/client';
import { BaseRepository } from '@shared/abstract/base.service';
import { PostgresqlService } from '../../postgresql.service';

@Injectable()
export class LogRepository extends BaseRepository<Prisma.LogDelegate, Log> {
  constructor(prisma: PostgresqlService) {
    super(prisma, prisma.log);
  }

  /**
   * Удаляет старые логи батчами для предотвращения блокировки БД
   * @param cutoffDate - дата, до которой удалять логи
   * @returns количество удаленных логов
   */
  async deleteOldLogs(cutoffDate: Date): Promise<number> {
    const BATCH_SIZE = 1000;
    let totalDeleted = 0;
    let deletedInBatch = 0;

    do {
      deletedInBatch = await this.prisma.$transaction(async (tx) => {
        const logsToDelete = await tx.log.findMany({
          where: {
            timestamp: {
              lt: cutoffDate,
            },
          },
          select: { id: true },
          take: BATCH_SIZE,
        });

        if (logsToDelete.length === 0) {
          return 0;
        }

        const deleted = await tx.log.deleteMany({
          where: {
            id: {
              in: logsToDelete.map((log) => log.id),
            },
          },
        });

        return deleted.count;
      });

      totalDeleted += deletedInBatch;

      // Пауза между батчами для предотвращения блокировки
      if (deletedInBatch > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } while (deletedInBatch === BATCH_SIZE);

    return totalDeleted;
  }

  /**
   * Найти логи проекта с фильтрами
   */
  async findByProjectId(
    projectId: string,
    filters?: {
      level?: string[];
      tags?: string[];
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.LogWhereInput = {
      projectId,
    };

    if (filters) {
      if (filters.level && filters.level.length > 0) {
        where.level = {
          in: filters.level as $Enums.LogLevel[],
        };
      }

      if (filters.tags && filters.tags.length > 0) {
        where.tags = {
          hasEvery: filters.tags,
        };
      }

      if (filters.from || filters.to) {
        where.timestamp = {};
        if (filters.from) {
          where.timestamp.gte = filters.from;
        }
        if (filters.to) {
          where.timestamp.lte = filters.to;
        }
      }
    }

    return await this.delegate.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });
  }

  /**
   * Подсчет логов проекта (для пагинации)
   */
  async countByProjectId(
    projectId: string,
    filters?: {
      level?: string[];
      tags?: string[];
      from?: Date;
      to?: Date;
    },
  ): Promise<number> {
    const where: Prisma.LogWhereInput = {
      projectId,
    };

    if (filters) {
      if (filters.level && filters.level.length > 0) {
        where.level = {
          in: filters.level as $Enums.LogLevel[],
        };
      }

      if (filters.tags && filters.tags.length > 0) {
        where.tags = {
          hasEvery: filters.tags,
        };
      }

      if (filters.from || filters.to) {
        where.timestamp = {};
        if (filters.from) {
          where.timestamp.gte = filters.from;
        }
        if (filters.to) {
          where.timestamp.lte = filters.to;
        }
      }
    }

    return await this.delegate.count({ where });
  }
}
