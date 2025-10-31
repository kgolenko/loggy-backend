import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { LoggingInterceptor, TransformInterceptor } from '@shared/interceptor';
import { HttpExceptionFilter } from '@shared/filters';
import { useSwagger } from '@shared/utils';
import { ConfigService } from '@nestjs/config';
import { CONFIG__ENABLE_SWAGGER, CONFIG__PORT } from '@shared/constants';

export class BootstrapHttpProduct {
  async bootstrap(appModule: any): Promise<void> {
    const expressInstance = express();
    const logger = new Logger(BootstrapHttpProduct.name);

    const app = await NestFactory.create(
      appModule,
      new ExpressAdapter(expressInstance),
    );
    const configService = app.get(ConfigService);

    app.useGlobalPipes(new ValidationPipe());
    app.enableVersioning({
      type: VersioningType.URI,
    });

    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new LoggingInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    const port = configService.getOrThrow<number>(CONFIG__PORT);

    if (configService.getOrThrow<boolean>(CONFIG__ENABLE_SWAGGER)) {
      useSwagger(app);
    }

    await app.listen(port, '0.0.0.0').then(() => {
      logger.log(`Server is running on port ${port}`);
    });
  }
}
