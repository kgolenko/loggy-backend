import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LogsService } from './logs.service';
import { CreateLogDto, LogFiltersDto } from './dto';
import { ProjectTokenGuard } from './guards';
import { JwtAuthGuard } from '@common/auth/guards';
import { AuthRequest } from '@common/auth/interfaces';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ProjectTokenGuard)
  async create(
    @Body() createLogDto: CreateLogDto,
    @Request() req: any, // project добавляется в guard
  ) {
    return this.logsService.create(createLogDto, req.project.token);
  }
}

@Controller('projects/:projectId/logs')
@UseGuards(JwtAuthGuard)
export class ProjectLogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async findAll(
    @Param('projectId') projectId: string,
    @Query() filters: LogFiltersDto,
    @Request() req: AuthRequest,
  ) {
    const parsedFilters = {
      level: filters.level,
      tags: filters.tags,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
      limit: filters.limit,
      offset: filters.offset,
    };

    const [logs, total] = await Promise.all([
      this.logsService.findByProjectId(
        req.user.userId,
        projectId,
        parsedFilters,
      ),
      this.logsService.countByProjectId(req.user.userId, projectId, {
        level: filters.level,
        tags: filters.tags,
        from: parsedFilters.from,
        to: parsedFilters.to,
      }),
    ]);

    return {
      data: logs,
      total,
      limit: parsedFilters.limit || 100,
      offset: parsedFilters.offset || 0,
    };
  }

  @Get(':id')
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Request() req: AuthRequest,
  ) {
    return this.logsService.findOne(req.user.userId, projectId, id);
  }
}
