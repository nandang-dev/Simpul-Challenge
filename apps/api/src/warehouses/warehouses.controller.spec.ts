import type { WarehouseResponse } from '@simpul/shared';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';

describe('WarehousesController', () => {
  it('returns the warehouses provided by the service', () => {
    const warehouses: WarehouseResponse[] = [
      {
        id: 'W02',
        city: 'Surabaya',
        distanceKm: 12,
        hasColdStorage: true,
        hasRefrigeratedFleet: false,
        stock: [
          {
            productId: 'P002',
            productName: 'Vaccine — Hepatitis B',
            quantity: 30,
          },
        ],
      },
    ];
    const getWarehouses = jest.fn().mockReturnValue(warehouses);
    const service = { getWarehouses } as unknown as WarehousesService;
    const controller = new WarehousesController(service);

    expect(controller.getWarehouses()).toBe(warehouses);
    expect(getWarehouses).toHaveBeenCalledTimes(1);
  });
});