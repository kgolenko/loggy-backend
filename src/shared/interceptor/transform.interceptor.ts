import {
  Injectable,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
} from '@nestjs/common';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import dayjs from 'dayjs';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => ({
        statusCode: ctx.statusCode,
        timestamp: dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss'),
        data,
      })),
    );
  }
}
