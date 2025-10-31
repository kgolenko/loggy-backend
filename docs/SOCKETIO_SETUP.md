# Socket.IO Настройка для Loggy

## Установка зависимостей

```bash
npm install @nestjs/platform-socket.io socket.io
npm install --save-dev @types/socket.io
```

## Структура Realtime Gateway

### Основной Gateway

```typescript
// domain/realtime/realtime.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/auth/guards';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: {
    origin: '*', // или указать конкретный origin для продакшена
    credentials: true,
  },
  namespace: '/realtime',
})
@UseGuards(JwtAuthGuard) // JWT авторизация для WebSocket
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly realtimeService: RealtimeService) {}

  async handleConnection(client: Socket) {
    // Извлечь user из токена (через middleware или guard)
    const user = client.data.user;
    console.log(`Client connected: ${client.id}, User: ${user.userId}`);
  }

  async handleDisconnect(client: Socket) {
    // Отписаться от всех подписок
    await this.realtimeService.unsubscribeAll(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; filters?: RealtimeFilters },
  ) {
    const user = client.data.user;
    
    // Проверить доступ к проекту
    const hasAccess = await this.realtimeService.checkProjectAccess(
      user.userId,
      data.projectId,
    );

    if (!hasAccess) {
      client.emit('error', {
        message: 'Access denied to project',
        projectId: data.projectId,
      });
      return;
    }

    // Подписаться на проект с фильтрами
    await this.realtimeService.subscribe(
      client.id,
      data.projectId,
      data.filters,
    );

    // Добавить клиента в room проекта
    client.join(`project:${data.projectId}`);

    client.emit('subscribed', {
      projectId: data.projectId,
      filters: data.filters,
    });
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    await this.realtimeService.unsubscribe(client.id, data.projectId);
    client.leave(`project:${data.projectId}`);
    client.emit('unsubscribed', { projectId: data.projectId });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }
}
```

### Realtime Service

```typescript
// domain/realtime/realtime.service.ts

import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { RealtimeFilters } from './interfaces';
import { Log } from '@prisma/client';

@Injectable()
export class RealtimeService {
  // Хранение подписок: clientId -> Map<projectId, filters>
  private subscriptions = new Map<string, Map<string, RealtimeFilters>>();

  async subscribe(
    clientId: string,
    projectId: string,
    filters?: RealtimeFilters,
  ) {
    if (!this.subscriptions.has(clientId)) {
      this.subscriptions.set(clientId, new Map());
    }

    const clientSubs = this.subscriptions.get(clientId);
    clientSubs.set(projectId, filters || {});
  }

  async unsubscribe(clientId: string, projectId: string) {
    const clientSubs = this.subscriptions.get(clientId);
    if (clientSubs) {
      clientSubs.delete(projectId);
    }
  }

  async unsubscribeAll(clientId: string) {
    this.subscriptions.delete(clientId);
  }

  async checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
    // Проверить доступ через ProjectRepository
    // Вернуть true если пользователь владелец проекта
  }

  // Отправить новый лог всем подписчикам проекта
  broadcastLog(server: Server, projectId: string, log: Log) {
    const room = `project:${projectId}`;
    
    // Получить всех клиентов в комнате
    const clients = server.sockets.adapter.rooms.get(room);
    
    if (!clients) return;

    // Фильтровать логи для каждого клиента
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
    if (!filters) return true; // Нет фильтров = показывать все

    // Фильтр по уровню
    if (filters.level && !filters.level.includes(log.level)) {
      return false;
    }

    // Фильтр по тегам
    if (filters.tags && filters.tags.length > 0) {
      const hasAnyTag = filters.tags.some((tag) => log.tags.includes(tag));
      if (!hasAnyTag) return false;
    }

    // Фильтр по metadata
    if (filters.metadata && log.metadata) {
      // Проверить все ключи фильтра в metadata
      for (const [key, value] of Object.entries(filters.metadata)) {
        if (log.metadata[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }
}
```

## Интеграция с Logs Service

```typescript
// domain/logs/logs.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { Server } from 'socket.io';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RealtimeService } from '@domain/realtime/realtime.service';

@Injectable()
export class LogsService {
  constructor(
    private readonly logRepository: LogRepository,
    @Inject('IO_SERVER') private readonly io: Server, // Инжектировать Socket.IO server
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(createLogDto: CreateLogDto, projectId: string) {
    const log = await this.logRepository.create({
      ...createLogDto,
      projectId,
    });

    // Отправить через Socket.IO всем подписчикам
    this.realtimeService.broadcastLog(this.io, projectId, log);

    return log;
  }
}
```

## Настройка модуля

```typescript
// domain/realtime/realtime.module.ts

import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProjectsModule],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
```

## JWT авторизация для WebSocket

### Socket.IO Middleware для JWT

```typescript
// domain/realtime/middleware/socket-jwt.middleware.ts

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class SocketJwtMiddleware {
  constructor(private jwtService: JwtService) {}

  // Middleware функция для Socket.IO
  static create(jwtService: JwtService) {
    const middleware = new SocketJwtMiddleware(jwtService);
    return (socket: Socket, next: Function) => {
      middleware.use(socket, next);
    };
  }

  async use(socket: Socket, next: Function) {
    try {
      const token = this.extractToken(socket);
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const payload = await this.jwtService.verifyAsync(token);
      socket.data.user = {
        userId: payload.sub,
        email: payload.email,
      };

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  }

  private extractToken(socket: Socket): string | null {
    // Из query параметров
    const token = socket.handshake.query.token as string;
    if (token) return token;

    // Из headers
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
```

### Применение middleware в Gateway

```typescript
// domain/realtime/realtime.gateway.ts

import { UseGuards } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    // Применить JWT middleware
    server.use(SocketJwtMiddleware.create(this.jwtService));
  }
}
```

## Redis Adapter (для масштабирования)

Если нужно горизонтальное масштабирование:

```bash
npm install @socket.io/redis-adapter redis
```

```typescript
// domain/realtime/realtime.module.ts

import { RedisAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

@Module({})
export class RealtimeModule implements OnModuleInit {
  async onModuleInit() {
    const pubClient = createClient({ url: 'redis://localhost:6379' });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.server.adapter(RedisAdapter(pubClient, subClient));
  }
}
```

## Клиентская часть (пример)

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/realtime', {
  query: {
    token: 'your-jwt-token',
  },
});

socket.on('connect', () => {
  console.log('Connected to realtime server');
  
  // Подписаться на все логи проекта
  socket.emit('subscribe', {
    projectId: 'project-uuid',
  });

  // Подписаться с фильтрами
  socket.emit('subscribe', {
    projectId: 'project-uuid',
    filters: {
      level: ['error', 'warn'],
      tags: ['payment'],
    },
  });
});

socket.on('log:new', (log) => {
  console.log('New log:', log);
});

socket.on('subscribed', (data) => {
  console.log('Subscribed to:', data);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

## Резюме

**Преимущества Socket.IO:**
- ✅ Автоматический fallback на polling
- ✅ Простота использования
- ✅ Встроенная поддержка rooms и namespaces
- ✅ Отличная документация
- ✅ Redis adapter для масштабирования

**Что нужно реализовать:**
1. Установить `@nestjs/platform-socket.io` и `socket.io`
2. Создать RealtimeGateway
3. Реализовать JWT middleware для WebSocket
4. Интегрировать с LogsService для broadcast новых логов

