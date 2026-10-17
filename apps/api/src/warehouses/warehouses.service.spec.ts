import type { WarehouseResponse } from '@simpul/shared';
import { InventoryRepository } from '../data/inventory.repository';
import { WarehousesService } from './warehouses.service';

describe('WarehousesService', () => {
  it('returns warehouses and stock sorted by id using the inventory repository', () => {
    const warehouses: WarehouseResponse[] = [
      {
        id: 'W02',
        city: 'Surabaya',
        distanceKm: 12,
        hasColdStorage: true,
        hasRefrigeratedFleet: false,
        stock: [
          { productId: 'P004', productName: 'Vaccine — Tetanus Toxoid', quantity: 20 },
          { productId: 'P001', productName: 'Surgical Gloves', quantity: 50 },
        ],
      },
      {
        id: 'W01',
        city: 'Surabaya',
        distanceKm: 5,
        hasColdStorage: false,
        hasRefrigeratedFleet: false,
        stock: [
          { productId: 'P003', productName: 'Disposable Syringe', quantity: 500 },
          { productId: 'P001', productName: 'Surgical Gloves', quantity: 200 },
        ],
      },
    ];
    const getWarehouses = jest.fn().mockReturnValue(warehouses);
    const repository = { getWarehouses } as unknown as InventoryRepository;
    const service = new WarehousesService(repository);
    const result = service.getWarehouses();

    expect(result.map(({ id }) => id)).toEqual(['W01', 'W02']);
    expect(result[0].stock.map(({ productId }) => productId)).toEqual(['P001', 'P003']);
    expect(result[1].stock.map(({ productId }) => productId)).toEqual(['P001', 'P004']);
    expect(result[1]).toMatchObject({
      hasColdStorage: true,
      hasRefrigeratedFleet: false,
    });
    expect(getWarehouses).toHaveBeenCalledTimes(1);
  });
});