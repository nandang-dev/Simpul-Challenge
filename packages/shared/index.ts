export type SharedPlaceholder = {
  message: string;
};

export interface ProductResponse {
  id: string;
  name: string;
  category: string;
  unit: string;
  requiresColdChain: boolean;
}

export interface WarehouseStockItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface WarehouseResponse {
  id: string;
  city: string;
  distanceKm: number;
  hasColdStorage: boolean;
  hasRefrigeratedFleet: boolean;
  stock: WarehouseStockItem[];
}
