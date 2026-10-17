import { selectWarehouses } from './allocation-selection';
import type { SelectionOrder } from './selection.types';

const product = (id = 'P001', requiresColdChain = false, unit = 'unit') => ({
  id,
  name: `Product ${id}`,
  category: 'Test',
  unit,
  requiresColdChain,
});

const warehouse = (
  id: string,
  distanceKm: number,
  stock: Array<{ productId: string; quantity: number }>,
  options: { hasColdStorage?: boolean; hasRefrigeratedFleet?: boolean } = {},
) => ({
  id,
  city: `City ${id}`,
  distanceKm,
  hasColdStorage: options.hasColdStorage ?? true,
  hasRefrigeratedFleet: options.hasRefrigeratedFleet ?? true,
  stock: stock.map(({ productId, quantity }) => ({
    productId,
    productName: `Product ${productId}`,
    quantity,
  })),
});

const order = (
  items: Array<{ productId: string; quantity: number }>,
  options: Pick<SelectionOrder, 'distanceToleranceKm' | 'maxDistanceKm'> = {},
): SelectionOrder => ({ items, ...options });

const sentQuantities = (result: ReturnType<typeof selectWarehouses>) =>
  Object.fromEntries(
    result.allocations.map(({ warehouseId, items }) => [
      warehouseId,
      Object.fromEntries(items.map(({ productId, quantity }) => [productId, quantity])),
    ]),
  );

describe('selectWarehouses', () => {
  it('reports NO_STOCK for P001 in W04, W06, and W08', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 1 }]),
      [product()],
      [warehouse('W04', 30, []), warehouse('W06', 95, []), warehouse('W08', 150, [])],
    );

    expect(result.status).toBe('UNFULFILLABLE');
    expect(result.skipped.map(({ warehouseId, reasonCode }) => [warehouseId, reasonCode])).toEqual([
      ['W04', 'NO_STOCK'],
      ['W06', 'NO_STOCK'],
      ['W08', 'NO_STOCK'],
    ]);
  });

  it('uses NO_COLD_STORAGE as the first cold-chain eligibility reason', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 1 }]),
      [product('P001', true)],
      [warehouse('W01', 5, [{ productId: 'P001', quantity: 1 }], { hasColdStorage: false })],
    );

    expect(result.skipped[0]).toMatchObject({ warehouseId: 'W01', reasonCode: 'NO_COLD_STORAGE' });
  });

  it('reports NO_REFRIGERATED_FLEET when cold storage is available', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 1 }]),
      [product('P001', true)],
      [warehouse('W02', 12, [{ productId: 'P001', quantity: 1 }], { hasRefrigeratedFleet: false })],
    );

    expect(result.skipped[0]).toMatchObject({
      warehouseId: 'W02',
      reasonCode: 'NO_REFRIGERATED_FLEET',
      message: 'Warehouse W02 has no refrigerated fleet to deliver Product P001.',
    });
  });

  it('reports BEYOND_MAX_DISTANCE for otherwise eligible stock', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 1 }], { maxDistanceKm: 10 }),
      [product()],
      [warehouse('W01', 11, [{ productId: 'P001', quantity: 1 }])],
    );

    expect(result.skipped[0]).toMatchObject({
      warehouseId: 'W01',
      reasonCode: 'BEYOND_MAX_DISTANCE',
    });
  });

  it('treats maxDistanceKm 0 as unlimited', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 1 }], { maxDistanceKm: 0 }),
      [product()],
      [warehouse('W01', 150, [{ productId: 'P001', quantity: 1 }])],
    );

    expect(result.status).toBe('FULL');
    expect(sentQuantities(result)).toEqual({ W01: { P001: 1 } });
    expect(result.skipped).toEqual([]);
  });

  it('evaluates eligibility separately for each warehouse and product', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 1 }]),
      [product('P001', true)],
      [
        warehouse('W01', 5, [{ productId: 'P001', quantity: 1 }]),
        warehouse('W02', 12, [{ productId: 'P001', quantity: 1 }], { hasColdStorage: false }),
      ],
    );

    expect(result.status).toBe('FULL');
    expect(sentQuantities(result)).toEqual({ W01: { P001: 1 } });
    expect(result.skipped).toEqual([
      expect.objectContaining({ warehouseId: 'W02', productId: 'P001', reasonCode: 'NO_COLD_STORAGE' }),
    ]);
  });

  it('caps each product target at its total eligible stock', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 10 }]),
      [product()],
      [warehouse('W01', 5, [{ productId: 'P001', quantity: 4 }])],
    );

    expect(result.status).toBe('PARTIAL');
    expect(result.lines).toEqual([{ productId: 'P001', requested: 10, fulfilled: 4, shortage: 6 }]);
    expect(sentQuantities(result)).toEqual({ W01: { P001: 4 } });
  });

  it('splits a product across closest warehouses when no single warehouse has the target', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 10 }]),
      [product()],
      [
        warehouse('W01', 5, [{ productId: 'P001', quantity: 4 }]),
        warehouse('W02', 12, [{ productId: 'P001', quantity: 6 }]),
      ],
    );

    expect(sentQuantities(result)).toEqual({ W01: { P001: 4 }, W02: { P001: 6 } });
    expect(result.totalDistanceKm).toBe(17);
    expect(result.explanation).toContain('because no single warehouse can send the whole order.');
    expect(result.explanation).not.toMatch(/tolerance/i);
  });

  it('uses the closest warehouse that can supply a full target inside a combination', () => {
    const result = selectWarehouses(
      order([
        { productId: 'P001', quantity: 10 },
        { productId: 'P002', quantity: 1 },
      ]),
      [product('P001'), product('P002')],
      [
        warehouse('W01', 5, [{ productId: 'P001', quantity: 10 }]),
        warehouse('W02', 10, [
          { productId: 'P001', quantity: 5 },
          { productId: 'P002', quantity: 1 },
        ]),
      ],
    );

    expect(sentQuantities(result)).toEqual({ W01: { P001: 10 }, W02: { P002: 1 } });
  });

  it('ranks candidates by fewest warehouses before distance inside the tolerance', () => {
    const result = selectWarehouses(
      order(
        [
          { productId: 'P001', quantity: 10 },
          { productId: 'P002', quantity: 10 },
        ],
        { distanceToleranceKm: 10 },
      ),
      [product('P001'), product('P002')],
      [
        warehouse('W01', 10, [
          { productId: 'P001', quantity: 10 },
          { productId: 'P002', quantity: 10 },
        ]),
        warehouse('W02', 4, [{ productId: 'P001', quantity: 10 }]),
        warehouse('W03', 6, [{ productId: 'P002', quantity: 10 }]),
      ],
    );

    expect(result.allocations.map(({ warehouseId }) => warehouseId)).toEqual(['W01']);
    expect(result.totalDistanceKm).toBe(10);
  });

  it('lets distance tolerance select one distant warehouse instead of a closer pair', () => {
    const products = [product()];
    const warehouses = [
      warehouse('W01', 5, [{ productId: 'P001', quantity: 200 }]),
      warehouse('W03', 25, [{ productId: 'P001', quantity: 300 }]),
      warehouse('W05', 90, [{ productId: 'P001', quantity: 400 }]),
    ];

    const withinTolerance = selectWarehouses(
      order([{ productId: 'P001', quantity: 400 }], { distanceToleranceKm: 60 }),
      products,
      warehouses,
    );
    const outsideTolerance = selectWarehouses(
      order([{ productId: 'P001', quantity: 400 }], { distanceToleranceKm: 59 }),
      products,
      warehouses,
    );

    expect(withinTolerance.allocations.map(({ warehouseId }) => warehouseId)).toEqual(['W05']);
    expect(withinTolerance.totalDistanceKm).toBe(90);
    expect(withinTolerance.explanation).toMatch(/tolerance/i);
    expect(outsideTolerance.allocations.map(({ warehouseId }) => warehouseId)).toEqual(['W01', 'W03']);
    expect(outsideTolerance.totalDistanceKm).toBe(30);
  });

  it('explains when a split is shorter than the best single-warehouse option', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 400 }]),
      [product('P001', false, 'box of 100')],
      [
        warehouse('W01', 5, [{ productId: 'P001', quantity: 200 }]),
        warehouse('W03', 25, [{ productId: 'P001', quantity: 300 }]),
        warehouse('W05', 90, [{ productId: 'P001', quantity: 400 }]),
      ],
    );

    expect(result.allocations.map(({ warehouseId }) => warehouseId)).toEqual(['W01', 'W03']);
    expect(result.explanation).toContain('W01 and W03 at 30 km in total, shorter than W05 alone at 90 km.');
    expect(result.explanation).not.toContain('no single warehouse can send the whole order');
    expect(result.explanation).not.toMatch(/tolerance/i);
  });

  it('uses sorted warehouse ids to break otherwise equal candidate ties', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 5 }]),
      [product()],
      [
        warehouse('W02', 10, [{ productId: 'P001', quantity: 5 }]),
        warehouse('W01', 10, [{ productId: 'P001', quantity: 5 }]),
      ],
    );

    expect(result.allocations.map(({ warehouseId }) => warehouseId)).toEqual(['W01']);
  });

  it('returns PARTIAL when eligible stock cannot fulfill the request', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 5 }]),
      [product()],
      [warehouse('W01', 5, [{ productId: 'P001', quantity: 2 }])],
    );

    expect(result.status).toBe('PARTIAL');
    expect(result.lines[0]).toEqual({ productId: 'P001', requested: 5, fulfilled: 2, shortage: 3 });
  });

  it('returns UNFULFILLABLE with HTTP-independent decision data when nothing can be sent', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 5 }]),
      [product()],
      [warehouse('W01', 5, [])],
    );

    expect(result.status).toBe('UNFULFILLABLE');
    expect(result.allocations).toEqual([]);
    expect(result.totalDistanceKm).toBe(0);
    expect(result.warehouseCount).toBe(0);
    expect(result.lines[0]).toEqual({ productId: 'P001', requested: 5, fulfilled: 0, shortage: 5 });
  });

  it('explains a single-warehouse plan and its total distance', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 5 }]),
      [product()],
      [warehouse('W01', 5, [{ productId: 'P001', quantity: 5 }])],
    );

    expect(result.explanation).toContain('one warehouse (W01)');
    expect(result.explanation).toContain('Total shipment distance is 5 km.');
    expect(result.explanation).not.toMatch(/tolerance/i);
  });

  it('explains why a product needed to be split across warehouses', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 10 }]),
      [product()],
      [
        warehouse('W01', 5, [{ productId: 'P001', quantity: 4 }]),
        warehouse('W02', 12, [{ productId: 'P001', quantity: 6 }]),
      ],
    );

    expect(result.explanation).toContain('The order is split across W01 and W02 because no single warehouse can send the whole order.');
    expect(result.explanation).toContain('Total shipment distance is 17 km.');
  });

  it('explains when distance tolerance changed the selected plan', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 400 }], { distanceToleranceKm: 60 }),
      [product()],
      [
        warehouse('W01', 5, [{ productId: 'P001', quantity: 200 }]),
        warehouse('W03', 25, [{ productId: 'P001', quantity: 300 }]),
        warehouse('W05', 90, [{ productId: 'P001', quantity: 400 }]),
      ],
    );

    expect(result.explanation).toContain('Distance tolerance changed the selection');
    expect(result.explanation).toContain('this 90 km plan instead of the 30 km minimum-distance plan.');
  });

  it('explains each product shortage for a partial result', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 120 }]),
      [{ ...product('P001', true, '10-dose vial'), name: 'Vaccine — Tetanus Toxoid' }],
      [warehouse('W01', 5, [{ productId: 'P001', quantity: 5 }])],
    );

    expect(result.explanation).toContain('The request is partially fulfilled');
    expect(result.explanation).toContain('short 115 × 10-dose vial of Vaccine — Tetanus Toxoid.');
  });

  it('explains that no quantities can be fulfilled for an unfulfillable result', () => {
    const result = selectWarehouses(
      order([{ productId: 'P001', quantity: 5 }]),
      [product()],
      [warehouse('W01', 5, [])],
    );

    expect(result.explanation).toContain('No eligible warehouse combination could supply any requested quantity.');
    expect(result.explanation).toContain('No requested quantities could be fulfilled.');
  });

  it('summarizes cold-chain exclusions and eligible warehouses left unused', () => {
    const gloves = product('P001');
    const vaccine = { ...product('P002', true), name: 'Vaccine Hepatitis B' };
    const result = selectWarehouses(
      order([
        { productId: 'P001', quantity: 1 },
        { productId: 'P002', quantity: 1 },
      ]),
      [gloves, vaccine],
      [
        warehouse('W01', 5, [
          { productId: 'P001', quantity: 1 },
          { productId: 'P002', quantity: 1 },
        ]),
        warehouse('W02', 8, [{ productId: 'P002', quantity: 1 }], { hasRefrigeratedFleet: false }),
        warehouse('W04', 10, [
          { productId: 'P001', quantity: 1 },
          { productId: 'P002', quantity: 1 },
        ]),
        warehouse('W06', 12, [{ productId: 'P002', quantity: 1 }], { hasRefrigeratedFleet: false }),
      ],
    );

    expect(result.explanation).toContain('Other eligible warehouses were not used because this plan has the shortest total distance.');
    expect(result.explanation).not.toContain('W02 was not used');
    expect(result.explanation).not.toContain('W06 was not used');
    expect(result.explanation).toContain('W02 and W06 were skipped for Vaccine Hepatitis B because they have no refrigerated fleet.');
  });

  it('throws when an order references an unknown product', () => {
    expect(() => selectWarehouses(
      order([{ productId: 'UNKNOWN', quantity: 1 }]),
      [],
      [],
    )).toThrow('Product not found: UNKNOWN');
  });
});
