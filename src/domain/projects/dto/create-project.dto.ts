import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Название проекта',
    example: 'My Awesome Project',
    type: String,
    maxLength: 255,
  })
  @IsString({ message: 'Название должно быть строкой' })
  @IsNotEmpty({ message: 'Название проекта обязательно' })
  @MaxLength(255, { message: 'Название не должно превышать 255 символов' })
  name: string;

  @ApiPropertyOptional({
    description: 'Описание проекта',
    example: 'Описание моего проекта для логирования',
    type: String,
    maxLength: 1000,
  })
  @IsString({ message: 'Описание должно быть строкой' })
  @IsOptional()
  @MaxLength(1000, { message: 'Описание не должно превышать 1000 символов' })
  description?: string;
}
