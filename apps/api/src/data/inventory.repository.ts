import { Injectable } from '@nestjs/common';
import type { ProductResponse, WarehouseResponse } from '@simpul/shared';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DataIntegrityError } from './data-integrity.error';
import {
  collectProductIds,
  validateProductRows,
  validateStockRows,
} from './inventory-data.validation';

@Injectable()
export class InventoryRepository {
  getProducts(): ProductResponse[] {
    const result = validateProductRows(this.readJson('products.json'));
    this.throwIfInvalid(result.issues);
    return result.data;
  }

  findProductsByIds(ids: string[]): ProductResponse[] {
    const requestedIds = new Set(ids);
    return this.getProducts().filter((product) => requestedIds.has(product.id));
  }

  findStockByProductIds(ids: string[]) {
    const { stock } = this.getValidatedInventory();
    const requestedIds = new Set(ids);
    return stock.filter((row) => requestedIds.has(row.productId));
  }

  getWarehouses(): WarehouseResponse[] {
    const { products, stock } = this.getValidatedInventory();
    const productNames = new Map(products.map((product) => [product.id, product.name]));
    const warehouses = new Map<string, WarehouseResponse>();

    for (const row of stock) {
      let warehouse = warehouses.get(row.warehouseId);

      if (!warehouse) {
        warehouse = {
          id: row.warehouseId,
          city: row.warehouseCity,
          distanceKm: row.warehouseDistanceKm,
          hasColdStorage: row.warehouseHasColdStorage,
          hasRefrigeratedFleet: row.warehouseHasRefrigeratedFleet,
          stock: [],
        };
        warehouses.set(row.warehouseId, warehouse);
      }

      warehouse.stock.push({
        productId: row.productId,
        productName: productNames.get(row.productId) ?? row.productId,
        quantity: row.quantity,
      });
    }

    return [...warehouses.values()];
  }

  private getValidatedInventory() {
    const productRows = this.readJson('products.json');
    const stockRows = this.readJson('warehouse-stock.json');
    const products = validateProductRows(productRows);
    const stock = validateStockRows(stockRows, collectProductIds(productRows));

    this.throwIfInvalid([...products.issues, ...stock.issues]);
    return { products: products.data, stock: stock.data };
  }

  private readJson(fileName: string): unknown {
    const dataDir = resolve(process.env.DATA_DIR ?? join(__dirname, '../../data'));
    return JSON.parse(readFileSync(join(dataDir, fileName), 'utf8')) as unknown;
  }

  private throwIfInvalid(issues: string[]): void {
    if (issues.length > 0) {
      throw new DataIntegrityError(issues);
    }
  }
}