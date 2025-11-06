import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectRepository } from '@common/database/postgresql/repositories/project';

@Injectable()
export class ProjectTokenGuard implements CanActivate {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Project token не предоставлен');
    }

    const project = await this.projectRepository.findByToken(token);

    if (!project) {
      throw new NotFoundException('Проект с таким токеном не найден');
    }

    request.project = project;

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const token = request.headers['x-project-token'];
    if (token) {
      return token;
    }

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }
}
