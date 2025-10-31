import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

type NextFunction = (err?: Error) => void;

@Injectable()
export class SocketJwtMiddleware {
  constructor(private jwtService: JwtService) {}

  // Middleware функция для Socket.IO
  static create(jwtService: JwtService) {
    const middleware = new SocketJwtMiddleware(jwtService);
    return (socket: Socket, next: NextFunction) => {
      middleware.use(socket, next);
    };
  }

  async use(socket: Socket, next: NextFunction) {
    try {
      const token = this.extractToken(socket);
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      const payload = await this.jwtService.verifyAsync(token);
      socket.data.user = {
        userId: payload.sub,
        email: payload.email,
      };

      next();
    } catch {
      next(new Error('Authentication error: Invalid token'));
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
