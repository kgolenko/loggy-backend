import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { Log } from '@prisma/client';
import { RealtimeFilters } from './interfaces';
import { ProjectRepository } from '@common/database/postgresql/repositories/project';
import { LogCreatedEvent } from '@domain/logs/events/log-created.event';

@Injectable()
export class RealtimeService {
  // Хранение подписок: clientId -> Map<projectId, filters>
  private subscriptions = new Map<string, Map<string, RealtimeFilters>>();
  private server: Server | null = null;

  constructor(private readonly projectRepository: ProjectRepository) {}

  setServer(server: Server) {
    this.server = server;
  }

  async subscribe(
    clientId: string,
    projectId: string,
    userId: string,
    filters?: RealtimeFilters,
  ): Promise<boolean> {
    const hasAccess = await this.checkProjectAccess(userId, projectId);
    if (!hasAccess) {
      return false;
    }

    if (!this.subscriptions.has(clientId)) {
      this.subscriptions.set(clientId, new Map());
    }

    const clientSubs = this.subscriptions.get(clientId)!;
    clientSubs.set(projectId, filters || {});

    return true;
  }

  unsubscribe(clientId: string, projectId: string) {
    const clientSubs = this.subscriptions.get(clientId);
    if (clientSubs) {
      clientSubs.delete(projectId);
    }
  }

  unsubscribeAll(clientId: string) {
    this.subscriptions.delete(clientId);
  }

  async checkProjectAccess(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    const project = await this.projectRepository.findByUserIdAndId(
      userId,
      projectId,
    );
    return project !== null;
  }

  @OnEvent('log.created')
  handleLogCreated(event: LogCreatedEvent) {
    if (!this.server) return;

    this.broadcastLog(this.server, event.projectId, event.log);
  }

  private broadcastLog(server: Server, projectId: string, log: Log) {
    if (!server || !server.sockets || !server.sockets.adapter) {
      return;
    }

    const room = `project:${projectId}`;

    const rooms = server.sockets.adapter.rooms;
    if (!rooms) {
      return;
    }

    const clients = rooms.get(room);
    if (!clients || clients.size === 0) {
      return;
    }

    clients.forEach((clientId) => {
      const socket = server.sockets.sockets.get(clientId);
      if (!socket) return;

      const clientSubs = this.subscriptions.get(clientId);
      const filters = clientSubs?.get(projectId);

      if (this.shouldSendLog(log, filters)) {
        socket.emit('log:new', log);
      }
    });
  }

  private shouldSendLog(log: Log, filters?: RealtimeFilters): boolean {
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }

    if (filters.level && filters.level.length > 0) {
      if (!filters.level.includes(log.level)) {
        return false;
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      const hasAnyTag = filters.tags.some((tag) => log.tags.includes(tag));
      if (!hasAnyTag) return false;
    }

    if (filters.metadata && log.metadata) {
      for (const [key, value] of Object.entries(filters.metadata)) {
        const logValue = (log.metadata as Record<string, any>)[key];
        if (logValue !== value) {
          return false;
        }
      }
    }

    return true;
  }
}
