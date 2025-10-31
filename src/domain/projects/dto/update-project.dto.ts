import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiPropertyOptional({
    description: 'Название проекта',
    example: 'Updated Project Name',
    type: String,
    maxLength: 255,
  })
  @IsString({ message: 'Название должно быть строкой' })
  @IsOptional()
  @MaxLength(255, { message: 'Название не должно превышать 255 символов' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Описание проекта',
    example: 'Обновленное описание проекта',
    type: String,
    maxLength: 1000,
  })
  @IsString({ message: 'Описание должно быть строкой' })
  @IsOptional()
  @MaxLength(1000, { message: 'Описание не должно превышать 1000 символов' })
  description?: string;
}
