import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRepository } from '@common/database/postgresql/repositories/project';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { Project } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async create(
    userId: string,
    createProjectDto: CreateProjectDto,
  ): Promise<Project> {
    return await this.projectRepository.create({
      ...createProjectDto,
      userId,
    });
  }

  async findAll(userId: string): Promise<Project[]> {
    return await this.projectRepository.findByUserId(userId);
  }

  async findOne(userId: string, id: string): Promise<Project> {
    const project = await this.projectRepository.findByUserIdAndId(userId, id);

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    return project;
  }

  async update(
    userId: string,
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    // Проверить существование и владение
    await this.findOne(userId, id);

    return await this.projectRepository.update({ id }, { ...updateProjectDto });
  }

  async remove(userId: string, id: string): Promise<void> {
    // Проверить существование и владение
    await this.findOne(userId, id);

    await this.projectRepository.delete({ id });
  }

  async regenerateToken(userId: string, id: string): Promise<Project> {
    // Проверить существование и владение
    await this.findOne(userId, id);

    return await this.projectRepository.regenerateToken(id);
  }
}
