import type { ProductResponse } from '@simpul/shared';
import { InventoryRepository } from '../data/inventory.repository';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  it('returns products sorted by id using the inventory repository', () => {
    const products: ProductResponse[] = [
      {
        id: 'P002',
        name: 'Vaccine — Hepatitis B',
        category: 'Pharmaceutical',
        unit: '10-dose vial',
        requiresColdChain: true,
      },
      {
        id: 'P001',
        name: 'Surgical Gloves',
        category: 'Medical Supplies',
        unit: 'box of 100',
        requiresColdChain: false,
      },
    ];
    const getProducts = jest.fn().mockReturnValue(products);
    const repository = { getProducts } as unknown as InventoryRepository;
    const service = new ProductsService(repository);

    expect(service.getProducts().map(({ id }) => id)).toEqual(['P001', 'P002']);
    expect(getProducts).toHaveBeenCalledTimes(1);
  });
});