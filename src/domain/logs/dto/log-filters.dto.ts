import {
  IsEnum,
  IsOptional,
  IsArray,
  IsString,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';

export class LogFiltersDto {
  @ApiPropertyOptional({
    description: 'Фильтр по уровням логов. Можно указать несколько уровней',
    example: ['error', 'warn'],
    enum: $Enums.LogLevel,
    isArray: true,
    enumName: 'LogLevel',
  })
  @IsArray({ message: 'Level должен быть массивом' })
  @IsEnum($Enums.LogLevel, {
    each: true,
    message:
      'Каждый уровень должен быть одним из: error, warn, info, debug, verbose',
  })
  @IsOptional()
  level?: $Enums.LogLevel[];

  @ApiPropertyOptional({
    description: 'Фильтр по тегам. Логи должны содержать хотя бы один из указанных тегов',
    example: ['payment', 'critical'],
    type: [String],
    isArray: true,
  })
  @IsArray({ message: 'Tags должен быть массивом' })
  @IsString({ each: true, message: 'Каждый тег должен быть строкой' })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Начальная дата для фильтрации (включительно) в формате ISO 8601',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDateString({}, { message: 'Неверный формат даты начала' })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    description: 'Конечная дата для фильтрации (включительно) в формате ISO 8601',
    example: '2024-01-31T23:59:59.999Z',
    type: String,
    format: 'date-time',
  })
  @IsDateString({}, { message: 'Неверный формат даты окончания' })
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({
    description: 'Количество записей для возврата (пагинация). По умолчанию 100',
    example: 100,
    type: Number,
    minimum: 1,
    default: 100,
  })
  @IsInt({ message: 'Limit должен быть целым числом' })
  @Min(1, { message: 'Limit должен быть больше 0' })
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Смещение для пагинации. Количество записей, которые нужно пропустить',
    example: 0,
    type: Number,
    minimum: 0,
    default: 0,
  })
  @IsInt({ message: 'Offset должен быть целым числом' })
  @Min(0, { message: 'Offset должен быть больше или равен 0' })
  @Type(() => Number)
  @IsOptional()
  offset?: number;
}
