import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ProductResponse } from '@simpul/shared';
import { ProductDto } from '../data/dto/product.dto';
import { ProductsService } from './products.service';

@ApiTags('Data')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'List products',
    description: 'Returns the product catalog for the frontend order form, including each product unit and cold-chain requirement.',
  })
  @ApiOkResponse({
    description: 'The product catalog sorted by product identifier.',
    type: [ProductDto]
  })
  getProducts(): ProductResponse[] {
    return this.productsService.getProducts();
  }
}