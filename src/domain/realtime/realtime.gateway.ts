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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';
import { SocketJwtMiddleware } from './middleware/socket-jwt.middleware';
import { RealtimeFilters } from './interfaces';

@WebSocketGateway({
  cors: {
    origin: '*', // В продакшене указать конкретный origin
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    // Применить JWT middleware
    server.use(SocketJwtMiddleware.create(this.jwtService));
    // Установить server в RealtimeService для broadcast
    this.realtimeService.setServer(server);
    this.logger.log('Realtime Gateway initialized');
  }

  handleConnection(client: Socket) {
    const user = client.data.user;
    if (user) {
      this.logger.log(`Client connected: ${client.id}, User: ${user.userId}`);
    } else {
      this.logger.warn(`Client connected without auth: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Отписаться от всех подписок
    this.realtimeService.unsubscribeAll(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { projectId: string; filters?: RealtimeFilters },
  ) {
    const user = client.data.user;

    if (!user) {
      client.emit('error', {
        message: 'Authentication required',
      });
      return;
    }

    // Подписаться на проект с фильтрами
    const hasAccess = await this.realtimeService.subscribe(
      client.id,
      data.projectId,
      user.userId,
      data.filters,
    );

    if (!hasAccess) {
      client.emit('error', {
        message: 'Access denied to project',
        projectId: data.projectId,
      });
      return;
    }

    // Добавить клиента в room проекта
    client.join(`project:${data.projectId}`);

    client.emit('subscribed', {
      projectId: data.projectId,
      filters: data.filters,
    });

    this.logger.log(
      `Client ${client.id} subscribed to project ${data.projectId}`,
    );
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    this.realtimeService.unsubscribe(client.id, data.projectId);
    client.leave(`project:${data.projectId}`);
    client.emit('unsubscribed', { projectId: data.projectId });

    this.logger.log(
      `Client ${client.id} unsubscribed from project ${data.projectId}`,
    );
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }
}
