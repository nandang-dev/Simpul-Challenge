import { ApiProperty } from '@nestjs/swagger';
import type { WarehouseStockItem } from '@simpul/shared';

export class WarehouseStockItemDto implements WarehouseStockItem {
  @ApiProperty({ description: 'Identifier of the stocked product.', example: 'P002' })
  productId: string;

  @ApiProperty({ description: 'Name of the stocked product.', example: 'Vaccine — Hepatitis B' })
  productName: string;

  @ApiProperty({ description: "Number of packages available, in the product's unit.", example: 30 })
  quantity: number;
}