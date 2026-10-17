import { InventoryRepository } from './inventory.repository';

describe('InventoryRepository', () => {
  it('groups stock rows by warehouse and attaches product names', () => {
    const warehouses = new InventoryRepository().getWarehouses();

    expect(warehouses).toHaveLength(8);
    expect(warehouses.map(({ id }) => id)).toEqual([
      'W01',
      'W02',
      'W03',
      'W04',
      'W05',
      'W06',
      'W07',
      'W08',
    ]);
    expect(warehouses[1]).toMatchObject({
      id: 'W02',
      hasColdStorage: true,
      hasRefrigeratedFleet: false,
      stock: [
        { productId: 'P001', productName: 'Surgical Gloves', quantity: 50 },
        { productId: 'P002', productName: 'Vaccine — Hepatitis B', quantity: 30 },
        { productId: 'P004', productName: 'Vaccine — Tetanus Toxoid', quantity: 20 },
      ],
    });
  });
});