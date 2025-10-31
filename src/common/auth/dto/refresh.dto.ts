import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh token для обновления access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  @IsString({ message: 'Refresh token должен быть строкой' })
  @IsNotEmpty({ message: 'Refresh token обязателен для заполнения' })
  refreshToken: string;
}
