import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import type { AllocationRequest, AllocationRequestItem } from '@simpul/shared';

export class AllocationRequestItemDto implements AllocationRequestItem {
  @ApiProperty({ description: 'Identifier of the product to allocate.', example: 'P002' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Requested quantity in the product packaging unit.', example: 50, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class AllocationRequestDto implements AllocationRequest {
  @ApiProperty({
    description: 'Products and positive quantities requested for allocation.',
    type: () => AllocationRequestItemDto,
    isArray: true,
    example: [{ productId: 'P002', quantity: 50 }],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((item: AllocationRequestItemDto) => item.productId)
  @ValidateNested({ each: true })
  @Type(() => AllocationRequestItemDto)
  items: AllocationRequestItemDto[];

  @ApiPropertyOptional({
    description: 'Allowed increase over the minimum total-distance candidate, in kilometers.',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  distanceToleranceKm?: number;

  @ApiPropertyOptional({
    description: 'Maximum permitted warehouse distance from the customer, in kilometers. Use 0 for no distance limit.',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  maxDistanceKm?: number;
}