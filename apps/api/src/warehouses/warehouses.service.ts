import { Injectable } from '@nestjs/common';
import type { WarehouseResponse } from '@simpul/shared';
import { InventoryRepository } from '../data/inventory.repository';

@Injectable()
export class WarehousesService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  getWarehouses(): WarehouseResponse[] {
    return this.inventoryRepository
      .getWarehouses()
      .toSorted((first, second) => first.id.localeCompare(second.id))
      .map((warehouse) => ({
        ...warehouse,
        stock: warehouse.stock.toSorted((first, second) =>
          first.productId.localeCompare(second.productId),
        ),
      }));
  }
}