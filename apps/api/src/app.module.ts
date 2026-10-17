import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InventoryRepository } from './data/inventory.repository';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { HealthController } from './health';

@Module({
  imports: [],
  controllers: [AppController, HealthController, ProductsController],
  providers: [AppService, InventoryRepository, ProductsService],
})
export class AppModule {}
