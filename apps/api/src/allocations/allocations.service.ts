import { BadRequestException, Injectable } from '@nestjs/common';
import type { AllocationRequest, AllocationResponse } from '@simpul/shared';
import { InventoryRepository } from '../data/inventory.repository';
import { selectWarehouses } from './allocation-selection';
import type { SelectionOrder, SelectionProduct, SelectionWarehouse } from './selection.types';

@Injectable()
export class AllocationsService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  create(request: AllocationRequest): AllocationResponse {
    const requestedProductIds = [...new Set(request.items.map(({ productId }) => productId))];
    const apiProducts = this.inventoryRepository.findProductsByIds(requestedProductIds);
    const foundProductIds = new Set(apiProducts.map(({ id }) => id));
    const missingProductIds = requestedProductIds.filter((id) => !foundProductIds.has(id));

    if (missingProductIds.length > 0) {
      throw new BadRequestException(`Unknown product(s): ${missingProductIds.join(', ')}`);
    }

    const order: SelectionOrder = {
      items: request.items.map(({ productId, quantity }) => ({ productId, quantity })),
      distanceToleranceKm: request.distanceToleranceKm,
      maxDistanceKm: request.maxDistanceKm,
    };
    const products: SelectionProduct[] = apiProducts.map(({ id, name, unit, requiresColdChain }) => ({
      id,
      name,
      unit,
      requiresColdChain,
    }));
    const warehouses: SelectionWarehouse[] = this.inventoryRepository.getWarehouses().map((warehouse) => ({
      id: warehouse.id,
      city: warehouse.city,
      distanceKm: warehouse.distanceKm,
      hasColdStorage: warehouse.hasColdStorage,
      hasRefrigeratedFleet: warehouse.hasRefrigeratedFleet,
      stock: warehouse.stock.map(({ productId, quantity }) => ({ productId, quantity })),
    }));

    return selectWarehouses(order, products, warehouses);
  }
}