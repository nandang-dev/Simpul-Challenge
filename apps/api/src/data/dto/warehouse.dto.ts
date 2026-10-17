import { ApiProperty } from '@nestjs/swagger';
import type { WarehouseResponse } from '@simpul/shared';
import { WarehouseStockItemDto } from './warehouse-stock-item.dto';

export class WarehouseDto implements WarehouseResponse {
  @ApiProperty({ description: 'Warehouse identifier.', example: 'W02' })
  id: string;

  @ApiProperty({ description: 'City where the warehouse is located.', example: 'Surabaya' })
  city: string;

  @ApiProperty({ description: 'Distance from the customer in kilometers.', example: 12 })
  distanceKm: number;

  @ApiProperty({ description: 'True when the warehouse has a refrigerated storage unit.', example: true })
  hasColdStorage: boolean;

  @ApiProperty({
    description: 'True if the delivery fleet includes refrigerated vans; required to deliver cold-chain products.',
    example: false,
  })
  hasRefrigeratedFleet: boolean;

  @ApiProperty({
    description: 'Products stocked at this warehouse, each with its available quantity.',
    type: () => WarehouseStockItemDto,
    isArray: true,
    example: [{ productId: 'P002', productName: 'Vaccine — Hepatitis B', quantity: 30 }],
  })
  stock: WarehouseStockItemDto[];
}