import { BadRequestException } from '@nestjs/common';
import type { AllocationRequest, ProductResponse, WarehouseResponse } from '@simpul/shared';
import { InventoryRepository } from '../data/inventory.repository';
import { AllocationsService } from './allocations.service';

describe('AllocationsService', () => {
  it('maps repository API models to engine inputs and returns the allocation response', () => {
    const products: ProductResponse[] = [
      { id: 'P001', name: 'Surgical Gloves', category: 'Medical', unit: 'box', requiresColdChain: false },
    ];
    const warehouses: WarehouseResponse[] = [
      {
        id: 'W01',
        city: 'Gresik',
        distanceKm: 5,
        hasColdStorage: true,
        hasRefrigeratedFleet: true,
        stock: [{ productId: 'P001', productName: 'Surgical Gloves', quantity: 4 }],
      },
    ];
    const findProductsByIds = jest.fn().mockReturnValue(products);
    const getWarehouses = jest.fn().mockReturnValue(warehouses);
    const inventoryRepository = { findProductsByIds, getWarehouses } as unknown as InventoryRepository;
    const service = new AllocationsService(inventoryRepository);
    const request: AllocationRequest = { items: [{ productId: 'P001', quantity: 4 }] };

    const result = service.create(request);

    expect(findProductsByIds).toHaveBeenCalledWith(['P001']);
    expect(result.status).toBe('FULL');
    expect(result.allocations[0].items).toEqual([
      { productId: 'P001', productName: 'Surgical Gloves', quantity: 4 },
    ]);
  });

  it('rejects request products that are absent from the repository', () => {
    const findProductsByIds = jest.fn().mockReturnValue([]);
    const getWarehouses = jest.fn();
    const inventoryRepository = { findProductsByIds, getWarehouses } as unknown as InventoryRepository;
    const service = new AllocationsService(inventoryRepository);

    expect(() => service.create({ items: [{ productId: 'UNKNOWN', quantity: 1 }] }))
      .toThrow(BadRequestException);
    expect(getWarehouses).not.toHaveBeenCalled();
  });
});