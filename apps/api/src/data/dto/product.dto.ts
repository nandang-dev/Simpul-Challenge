import { ApiProperty } from '@nestjs/swagger';
import type { ProductResponse } from '@simpul/shared';

export class ProductDto implements ProductResponse {
  @ApiProperty({ description: 'Product identifier.', example: 'P001' })
  id: string;

  @ApiProperty({ description: 'Product name without package size.', example: 'Surgical Gloves' })
  name: string;

  @ApiProperty({ description: 'Product category.', example: 'Medical Supplies' })
  category: string;

  @ApiProperty({ description: 'Packaging unit used when reporting stock quantity.', example: 'box of 100' })
  unit: string;

  @ApiProperty({ description: 'True when this product requires cold-chain handling.', example: false })
  requiresColdChain: boolean;
}