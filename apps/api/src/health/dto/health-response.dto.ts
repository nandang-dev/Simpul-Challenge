import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: 'ok';

  @ApiProperty({ example: 'api' })
  service: string;

  @ApiProperty({ example: '2026-10-18T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 3.14 })
  uptime: number;
}
