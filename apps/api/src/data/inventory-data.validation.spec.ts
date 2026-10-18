import {
  collectProductIds,
  validateProductRows,
  validateStockRows,
} from './inventory-data.validation';

const validProduct = {
  product_id: 'P001',
  name: 'Gloves',
  category: 'Medical Supplies',
  unit: 'box',
  requires_cold_chain: false,
};

const validStock = {
  warehouse_id: 'W01',
  warehouse_city: 'Jakarta',
  warehouse_distance_km: 5,
  warehouse_has_cold_storage: false,
  warehouse_has_refrigerated_fleet: false,
  product_id: 'P001',
  quantity: 10,
};

describe('inventory data validation', () => {
  it('reports missing required fields and fields with the wrong type', () => {
    const product = validateProductRows([
      { ...validProduct, name: undefined, category: 7, requires_cold_chain: 'false' },
    ]);
    const stock = validateStockRows(
      [{ ...validStock, warehouse_city: null, warehouse_has_cold_storage: 'false' }],
      new Set(['P001']),
    );

    expect(product.issues).toEqual([
      'products.json row 1: "name" must be a string',
      'products.json row 1: "category" must be a string',
      'products.json row 1: "requires_cold_chain" must be a boolean',
    ]);
    expect(stock.issues).toEqual([
      'warehouse-stock.json row 1: "warehouse_city" must be a string',
      'warehouse-stock.json row 1: "warehouse_has_cold_storage" must be a boolean',
    ]);
  });

  it('requires quantity to be an integer greater than or equal to zero', () => {
    const result = validateStockRows(
      [{ ...validStock, quantity: 1.5 }, { ...validStock, quantity: -1 }],
      new Set(['P001']),
    );

    expect(result.issues).toEqual([
      'warehouse-stock.json row 1: "quantity" must be an integer >= 0',
      'warehouse-stock.json row 2: "quantity" must be an integer >= 0',
    ]);
  });

  it('requires warehouse distance to be greater than or equal to zero', () => {
    const result = validateStockRows(
      [{ ...validStock, warehouse_distance_km: -0.1 }],
      new Set(['P001']),
    );

    expect(result.issues).toEqual([
      'warehouse-stock.json row 1: "warehouse_distance_km" must be >= 0',
    ]);
  });

  it('rejects stock rows whose product id does not exist', () => {
    const result = validateStockRows(
      [{ ...validStock, product_id: 'P999' }],
      collectProductIds([validProduct]),
    );

    expect(result.issues).toEqual([
      'warehouse-stock.json row 1: "product_id" references unknown product "P999"',
    ]);
  });

});
