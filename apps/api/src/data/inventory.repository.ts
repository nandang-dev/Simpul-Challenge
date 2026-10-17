import { Injectable } from '@nestjs/common';
import type { ProductResponse, WarehouseResponse } from '@simpul/shared';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface ProductRecord {
  product_id: string;
  name: string;
  category: string;
  unit: string;
  requires_cold_chain: boolean;
}

interface WarehouseStockRecord {
  warehouse_id: string;
  warehouse_city: string;
  warehouse_distance_km: number;
  warehouse_has_cold_storage: boolean;
  warehouse_has_refrigerated_fleet: boolean;
  product_id: string;
  quantity: number;
}

@Injectable()
export class InventoryRepository {
  getProducts(): ProductResponse[] {
    const filePath = join(__dirname, '../../data/products.json');
    const products = JSON.parse(readFileSync(filePath, 'utf8')) as ProductRecord[];

    return products.map((product) => ({
      id: product.product_id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      requiresColdChain: product.requires_cold_chain,
    }));
  }

  getWarehouses(): WarehouseResponse[] {
    const filePath = join(__dirname, '../../data/warehouse-stock.json');
    const rows = JSON.parse(readFileSync(filePath, 'utf8')) as WarehouseStockRecord[];
    const productNames = new Map(
      this.getProducts().map((product) => [product.id, product.name]),
    );
    const warehouses = new Map<string, WarehouseResponse>();

    for (const row of rows) {
      let warehouse = warehouses.get(row.warehouse_id);

      if (!warehouse) {
        warehouse = {
          id: row.warehouse_id,
          city: row.warehouse_city,
          distanceKm: row.warehouse_distance_km,
          hasColdStorage: row.warehouse_has_cold_storage,
          hasRefrigeratedFleet: row.warehouse_has_refrigerated_fleet,
          stock: [],
        };
        warehouses.set(row.warehouse_id, warehouse);
      }

      warehouse.stock.push({
        productId: row.product_id,
        productName: productNames.get(row.product_id) ?? row.product_id,
        quantity: row.quantity,
      });
    }

    return [...warehouses.values()];
  }
}