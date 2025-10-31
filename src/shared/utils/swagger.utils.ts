import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import packageJson from '../../../package.json';

export const useSwagger = (app: INestApplication) => {
  const logger = new Logger('Swagger');

  try {
    const config = new DocumentBuilder()
      .setTitle('Loggy API')
      .setDescription('API для управления Loggy')
      .setVersion(packageJson.version)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Введите JWT токен для аутентификации',
          in: 'header',
        },
        'JWTAuth',
      )
      .addBasicAuth(
        {
          type: 'http',
          scheme: 'basic',
          name: 'BasicAuth',
          description: 'Введите Basic Auth для аутентификации',
        },
        'BasicAuth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);

    app.use('/api-reference', apiReference({ content: document }));
    SwaggerModule.setup('api-docs', app, document, {
      customSiteTitle: 'Loggy API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
    });

    logger.log('[Swagger] Swagger доступен по адресу /api-docs');
    logger.log('[Swagger] API Reference доступен по адресу /api-reference');
  } catch (error) {
    logger.error('[Swagger] Ошибка при настройке Swagger:', error);
  }
};
