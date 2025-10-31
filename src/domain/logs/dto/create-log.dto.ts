import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';

export class CreateLogDto {
  @ApiProperty({
    description: 'Уровень лога',
    enum: $Enums.LogLevel,
    example: 'error',
    enumName: 'LogLevel',
  })
  @IsEnum($Enums.LogLevel, {
    message:
      'Уровень лога должен быть одним из: error, warn, info, debug, verbose',
  })
  @IsNotEmpty({ message: 'Уровень лога обязателен' })
  level: $Enums.LogLevel;

  @ApiProperty({
    description: 'Текст сообщения лога',
    example: 'Payment processing failed',
    type: String,
  })
  @IsString({ message: 'Сообщение должно быть строкой' })
  @IsNotEmpty({ message: 'Сообщение обязательно' })
  message: string;

  @ApiPropertyOptional({
    description: 'Временная метка лога в формате ISO 8601. Если не указана, используется текущее время',
    example: '2024-01-01T12:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDateString({}, { message: 'Неверный формат даты' })
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional({
    description: 'Метаданные лога в формате JSON. Может содержать информацию о сервисе, запросе, пользователе и т.д.',
    example: {
      service: 'payment-service',
      hostname: 'server-01',
      request: {
        id: 'req-123',
        method: 'POST',
        path: '/api/payment',
      },
    },
    type: Object,
  })
  @IsObject({ message: 'Metadata должен быть объектом' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Массив тегов для категоризации лога',
    example: ['payment', 'critical', 'retry'],
    type: [String],
    isArray: true,
  })
  @IsArray({ message: 'Tags должен быть массивом' })
  @IsString({ each: true, message: 'Каждый тег должен быть строкой' })
  @IsOptional()
  tags?: string[];
}
