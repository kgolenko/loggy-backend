import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import dayjs from 'dayjs';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    const status = exception.getStatus();
    const message =
      (exception.getResponse() as any)?.message || exception.message;

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss'),
    });
  }
}
