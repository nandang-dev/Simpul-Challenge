import { ApiProperty } from '@nestjs/swagger';
import type {
  AllocationItemResponse,
  AllocationLineResponse,
  AllocationReasonCode,
  AllocationResponse,
  AllocationStatus,
  SkippedAllocationResponse,
  WarehouseAllocationResponse,
} from '@simpul/shared';

export class AllocationItemResponseDto implements AllocationItemResponse {
  @ApiProperty({ description: 'Identifier of the allocated product.', example: 'P002' })
  productId: string;

  @ApiProperty({ description: 'Display name of the allocated product.', example: 'Vaccine — Hepatitis B' })
  productName: string;

  @ApiProperty({ description: 'Quantity shipped in the product packaging unit.', example: 30, minimum: 1 })
  quantity: number;
}

export class WarehouseAllocationResponseDto implements WarehouseAllocationResponse {
  @ApiProperty({ description: 'Identifier of the warehouse shipping these items.', example: 'W04' })
  warehouseId: string;

  @ApiProperty({ description: 'City where the warehouse is located.', example: 'Gresik' })
  city: string;

  @ApiProperty({ description: 'Warehouse distance from the customer, in kilometers.', example: 30, minimum: 0 })
  distanceKm: number;

  @ApiProperty({
    description: 'Products and quantities shipped by this warehouse.',
    type: () => AllocationItemResponseDto,
    isArray: true,
    example: [{ productId: 'P002', productName: 'Vaccine — Hepatitis B', quantity: 30 }],
  })
  items: AllocationItemResponseDto[];
}

export class AllocationLineResponseDto implements AllocationLineResponse {
  @ApiProperty({ description: 'Identifier of the requested product.', example: 'P002' })
  productId: string;

  @ApiProperty({ description: 'Requested quantity in the product packaging unit.', example: 50, minimum: 1 })
  requested: number;

  @ApiProperty({ description: 'Quantity fulfilled in the product packaging unit.', example: 30, minimum: 0 })
  fulfilled: number;

  @ApiProperty({ description: 'Quantity not fulfilled in the product packaging unit.', example: 20, minimum: 0 })
  shortage: number;
}

export class SkippedAllocationResponseDto implements SkippedAllocationResponse {
  @ApiProperty({ description: 'Identifier of the warehouse not eligible for this product.', example: 'W02' })
  warehouseId: string;

  @ApiProperty({ description: 'Identifier of the product considered for this warehouse.', example: 'P002' })
  productId: string;

  @ApiProperty({
    description: 'Reason code explaining why this warehouse cannot supply this product.',
    enum: ['NO_STOCK', 'NO_COLD_STORAGE', 'NO_REFRIGERATED_FLEET', 'BEYOND_MAX_DISTANCE'],
    example: 'NO_REFRIGERATED_FLEET',
  })
  reasonCode: AllocationReasonCode;

  @ApiProperty({ description: 'Plain-English explanation of the eligibility reason.', example: 'The warehouse has no refrigerated delivery fleet.' })
  message: string;
}

export class AllocationResponseDto implements AllocationResponse {
  @ApiProperty({
    description: 'Whether all requested quantities were fulfilled, partially fulfilled, or could not be fulfilled.',
    enum: ['FULL', 'PARTIAL', 'UNFULFILLABLE'],
    example: 'FULL',
  })
  status: AllocationStatus;

  @ApiProperty({
    description: 'Warehouse-by-warehouse shipment plan.',
    type: () => WarehouseAllocationResponseDto,
    isArray: true,
  })
  allocations: WarehouseAllocationResponseDto[];

  @ApiProperty({
    description: 'Requested, fulfilled, and short quantities for each product.',
    type: () => AllocationLineResponseDto,
    isArray: true,
  })
  lines: AllocationLineResponseDto[];

  @ApiProperty({ description: 'Sum of the distances in kilometers for warehouses that ship items.', example: 30, minimum: 0 })
  totalDistanceKm: number;

  @ApiProperty({ description: 'Number of warehouses that ship at least one item.', example: 1, minimum: 0 })
  warehouseCount: number;

  @ApiProperty({ description: 'One or two sentences explaining the selected plan and tolerance effect.', example: 'The plan uses the closest eligible warehouse that fulfills all requested quantities. Distance tolerance did not change the selection.' })
  explanation: string;

  @ApiProperty({
    description: 'Warehouse and product pairs excluded from consideration, with the first eligibility reason.',
    type: () => SkippedAllocationResponseDto,
    isArray: true,
  })
  skipped: SkippedAllocationResponseDto[];
}