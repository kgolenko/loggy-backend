import { PostgresqlService } from '@common/database/postgresql/postgresql.service';
import { Prisma } from '@prisma/client';

export abstract class BaseRepository<
  TDelegate extends { [key: string]: any },
  TModel,
> {
  protected constructor(
    protected readonly prisma: PostgresqlService,
    protected readonly delegate: TDelegate,
  ) {}

  async create(
    data: Prisma.Args<TDelegate, 'create'>['data'],
  ): Promise<TModel> {
    return await this.delegate.create({ data });
  }

  async findMany(
    params?: Prisma.Args<TDelegate, 'findMany'>,
  ): Promise<TModel[]> {
    return await this.delegate.findMany(params);
  }

  async findUnique(
    where: Prisma.Args<TDelegate, 'findUnique'>['where'],
  ): Promise<TModel | null> {
    return await this.delegate.findUnique({ where });
  }

  async update(
    where: Prisma.Args<TDelegate, 'update'>['where'],
    data: Prisma.Args<TDelegate, 'update'>['data'],
  ): Promise<TModel> {
    return await this.delegate.update({ where, data });
  }

  async delete(
    where: Prisma.Args<TDelegate, 'delete'>['where'],
  ): Promise<TModel> {
    return await this.delegate.delete({ where });
  }
}
