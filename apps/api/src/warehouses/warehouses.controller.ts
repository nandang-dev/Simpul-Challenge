import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { WarehouseResponse } from '@simpul/shared';
import { WarehouseDto } from '../data/dto/warehouse.dto';
import { WarehousesService } from './warehouses.service';

@ApiTags('Data')
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @ApiOperation({
    summary: 'List warehouses',
    description:
      'Returns every warehouse with its location, distance, storage and fleet facts, and stock list so reviewers and the UI can compare the reference data with allocation results.',
  })
  @ApiOkResponse({
    description: 'All warehouses with their stock, sorted by warehouse and product identifier.',
    type: [WarehouseDto],
  })
  getWarehouses(): WarehouseResponse[] {
    return this.warehousesService.getWarehouses();
  }
}