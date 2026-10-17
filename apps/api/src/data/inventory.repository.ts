import { Injectable } from '@nestjs/common';
import type { ProductResponse } from '@simpul/shared';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface ProductRecord {
  product_id: string;
  name: string;
  category: string;
  unit: string;
  requires_cold_chain: boolean;
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
}