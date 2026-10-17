import type { ProductResponse } from '@simpul/shared';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  it('returns the products provided by the service', () => {
    const products: ProductResponse[] = [
      {
        id: 'P001',
        name: 'Surgical Gloves',
        category: 'Medical Supplies',
        unit: 'box of 100',
        requiresColdChain: false,
      },
      {
        id: 'P002',
        name: 'Vaccine — Hepatitis B',
        category: 'Pharmaceutical',
        unit: '10-dose vial',
        requiresColdChain: true,
      },
    ];
    const service = {
      getProducts: jest.fn().mockReturnValue(products),
    } as unknown as ProductsService;
    const controller = new ProductsController(service);

    expect(controller.getProducts()).toBe(products);
    expect(service.getProducts).toHaveBeenCalledTimes(1);
  });
});