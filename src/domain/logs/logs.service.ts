import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LogRepository } from '@common/database/postgresql/repositories/log';
import { ProjectRepository } from '@common/database/postgresql/repositories/project';
import { CreateLogDto } from './dto';
import { Log } from '@prisma/client';
import { LogCreatedEvent } from './events/log-created.event';

@Injectable()
export class LogsService {
  constructor(
    private readonly logRepository: LogRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createLogDto: CreateLogDto, projectToken: string): Promise<Log> {
    const project = await this.projectRepository.findByToken(projectToken);

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    const timestamp = createLogDto.timestamp
      ? new Date(createLogDto.timestamp)
      : new Date();

    const log = await this.logRepository.create({
      projectId: project.id,
      level: createLogDto.level,
      message: createLogDto.message,
      timestamp,
      metadata: createLogDto.metadata || undefined,
      tags: createLogDto.tags || [],
    });

    this.eventEmitter.emit('log.created', new LogCreatedEvent(log, project.id));

    return log;
  }

  async findByProjectId(
    userId: string,
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
    const project = await this.projectRepository.findByUserIdAndId(
      userId,
      projectId,
    );

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    return await this.logRepository.findByProjectId(projectId, filters);
  }

  async countByProjectId(
    projectId: string,
    userId: string,
    filters?: {
      level?: string[];
      tags?: string[];
      from?: Date;
      to?: Date;
    },
  ) {
    const project = await this.projectRepository.findByUserIdAndId(
      userId,
      projectId,
    );

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    return await this.logRepository.countByProjectId(projectId, filters);
  }

  async findOne(projectId: string, userId: string, logId: string) {
    const project = await this.projectRepository.findByUserIdAndId(
      userId,
      projectId,
    );

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    const log = await this.logRepository.findUnique({ id: logId });

    if (!log || log.projectId !== projectId) {
      throw new NotFoundException('Лог не найден');
    }

    return log;
  }
}
