import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InventoryRepository } from './data/inventory.repository';
import { DataIntegrityExceptionFilter } from './data/data-integrity-exception.filter';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { WarehousesController } from './warehouses/warehouses.controller';
import { WarehousesService } from './warehouses/warehouses.service';
import { HealthController } from './health';
import { AllocationsController } from './allocations/allocations.controller';
import { AllocationsService } from './allocations/allocations.service';

@Module({
  imports: [],
  controllers: [AppController, HealthController, ProductsController, WarehousesController, AllocationsController],
  providers: [
    AppService,
    InventoryRepository,
    ProductsService,
    WarehousesService,
    AllocationsService,
    { provide: APP_FILTER, useClass: DataIntegrityExceptionFilter },
  ],
})
export class AppModule {}
