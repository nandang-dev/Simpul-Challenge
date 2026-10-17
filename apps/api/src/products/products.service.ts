import { Injectable } from '@nestjs/common';
import type { ProductResponse } from '@simpul/shared';
import { InventoryRepository } from '../data/inventory.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  getProducts(): ProductResponse[] {
    return this.inventoryRepository
      .getProducts()
      .toSorted((first, second) => first.id.localeCompare(second.id));
  }
}