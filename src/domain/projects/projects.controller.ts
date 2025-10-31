import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { JwtAuthGuard } from '@common/auth/guards';
import { AuthRequest } from '@common/auth/interfaces';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @Request() req: AuthRequest,
  ) {
    return this.projectsService.create(req.user.userId, createProjectDto);
  }

  @Get()
  async findAll(@Request() req: AuthRequest) {
    return this.projectsService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.projectsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: AuthRequest,
  ) {
    return this.projectsService.update(req.user.userId, id, updateProjectDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.projectsService.remove(req.user.userId, id);
  }

  @Post(':id/token')
  @HttpCode(HttpStatus.OK)
  async regenerateToken(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.projectsService.regenerateToken(req.user.userId, id);
  }
}
