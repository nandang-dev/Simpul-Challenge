import type { ProductResponse } from '@simpul/shared';

export interface ValidationResult<T> {
  data: T;
  issues: string[];
}

export interface ValidatedStockRow {
  warehouseId: string;
  warehouseCity: string;
  warehouseDistanceKm: number;
  warehouseHasColdStorage: boolean;
  warehouseHasRefrigeratedFleet: boolean;
  productId: string;
  quantity: number;
}

export function validateProductRows(rows: unknown): ValidationResult<ProductResponse[]> {
  const data: ProductResponse[] = [];
  const issues: string[] = [];

  if (!Array.isArray(rows)) {
    return { data, issues: ['products.json: expected an array of rows'] };
  }

  rows.forEach((row: unknown, index: number) => {
    const rowIssues: string[] = [];

    if (!isRecord(row)) {
      issues.push(`products.json row ${index + 1}: expected an object`);
      return;
    }

    requireString(row, 'product_id', 'products.json', index, rowIssues);
    requireString(row, 'name', 'products.json', index, rowIssues);
    requireString(row, 'category', 'products.json', index, rowIssues);
    requireString(row, 'unit', 'products.json', index, rowIssues);
    requireBoolean(row, 'requires_cold_chain', 'products.json', index, rowIssues);

    if (rowIssues.length > 0) {
      issues.push(...rowIssues);
      return;
    }

    data.push({
      id: row.product_id as string,
      name: row.name as string,
      category: row.category as string,
      unit: row.unit as string,
      requiresColdChain: row.requires_cold_chain as boolean,
    });
  });

  return { data, issues };
}

export function validateStockRows(
  rows: unknown,
  productIds: ReadonlySet<string>,
): ValidationResult<ValidatedStockRow[]> {
  const data: ValidatedStockRow[] = [];
  const issues: string[] = [];

  if (!Array.isArray(rows)) {
    return { data, issues: ['warehouse-stock.json: expected an array of rows'] };
  }

  rows.forEach((row: unknown, index: number) => {
    const rowIssues: string[] = [];

    if (!isRecord(row)) {
      issues.push(`warehouse-stock.json row ${index + 1}: expected an object`);
      return;
    }

    requireString(row, 'warehouse_id', 'warehouse-stock.json', index, rowIssues);
    requireString(row, 'warehouse_city', 'warehouse-stock.json', index, rowIssues);
    requireNumber(row, 'warehouse_distance_km', 'warehouse-stock.json', index, rowIssues);
    requireBoolean(row, 'warehouse_has_cold_storage', 'warehouse-stock.json', index, rowIssues);
    requireBoolean(row, 'warehouse_has_refrigerated_fleet', 'warehouse-stock.json', index, rowIssues);
    requireString(row, 'product_id', 'warehouse-stock.json', index, rowIssues);
    requireNumber(row, 'quantity', 'warehouse-stock.json', index, rowIssues);

    if (typeof row.warehouse_distance_km === 'number' && row.warehouse_distance_km < 0) {
      rowIssues.push(`warehouse-stock.json row ${index + 1}: "warehouse_distance_km" must be >= 0`);
    }
    if (typeof row.quantity === 'number' && (!Number.isInteger(row.quantity) || row.quantity < 0)) {
      rowIssues.push(`warehouse-stock.json row ${index + 1}: "quantity" must be an integer >= 0`);
    }
    if (typeof row.product_id === 'string' && !productIds.has(row.product_id)) {
      rowIssues.push(
        `warehouse-stock.json row ${index + 1}: "product_id" references unknown product "${row.product_id}"`,
      );
    }

    if (rowIssues.length > 0) {
      issues.push(...rowIssues);
      return;
    }

    data.push({
      warehouseId: row.warehouse_id as string,
      warehouseCity: row.warehouse_city as string,
      warehouseDistanceKm: row.warehouse_distance_km as number,
      warehouseHasColdStorage: row.warehouse_has_cold_storage as boolean,
      warehouseHasRefrigeratedFleet: row.warehouse_has_refrigerated_fleet as boolean,
      productId: row.product_id as string,
      quantity: row.quantity as number,
    });
  });

  return { data, issues };
}

export function collectProductIds(rows: unknown): Set<string> {
  if (!Array.isArray(rows)) {
    return new Set();
  }

  return new Set(
    rows.flatMap((row: unknown) =>
      isRecord(row) && typeof row.product_id === 'string' ? [row.product_id] : [],
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(
  row: Record<string, unknown>,
  field: string,
  source: string,
  index: number,
  issues: string[],
): void {
  if (typeof row[field] !== 'string') {
    issues.push(`${source} row ${index + 1}: "${field}" must be a string`);
  }
}

function requireNumber(
  row: Record<string, unknown>,
  field: string,
  source: string,
  index: number,
  issues: string[],
): void {
  if (typeof row[field] !== 'number' || !Number.isFinite(row[field])) {
    issues.push(`${source} row ${index + 1}: "${field}" must be a number`);
  }
}

function requireBoolean(
  row: Record<string, unknown>,
  field: string,
  source: string,
  index: number,
  issues: string[],
): void {
  if (typeof row[field] !== 'boolean') {
    issues.push(`${source} row ${index + 1}: "${field}" must be a boolean`);
  }
}