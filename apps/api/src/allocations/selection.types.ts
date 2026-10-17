export interface SelectionOrderItem {
  productId: string;
  quantity: number;
}

export interface SelectionOrder {
  items: SelectionOrderItem[];
  distanceToleranceKm?: number;
  maxDistanceKm?: number;
}

export interface SelectionProduct {
  id: string;
  name: string;
  unit: string;
  requiresColdChain: boolean;
}

export interface SelectionWarehouseStock {
  productId: string;
  quantity: number;
}

export interface SelectionWarehouse {
  id: string;
  city: string;
  distanceKm: number;
  hasColdStorage: boolean;
  hasRefrigeratedFleet: boolean;
  stock: SelectionWarehouseStock[];
}