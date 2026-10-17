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

export interface AllocationRequestItem {
  productId: string;
  quantity: number;
}

export interface AllocationRequest {
  items: AllocationRequestItem[];
  distanceToleranceKm?: number;
  maxDistanceKm?: number;
}

export type AllocationStatus = 'FULL' | 'PARTIAL' | 'UNFULFILLABLE';

export type AllocationReasonCode =
  | 'NO_STOCK'
  | 'NO_COLD_STORAGE'
  | 'NO_REFRIGERATED_FLEET'
  | 'BEYOND_MAX_DISTANCE';

export interface AllocationItemResponse {
  productId: string;
  productName: string;
  quantity: number;
}

export interface WarehouseAllocationResponse {
  warehouseId: string;
  city: string;
  distanceKm: number;
  items: AllocationItemResponse[];
}

export interface AllocationLineResponse {
  productId: string;
  requested: number;
  fulfilled: number;
  shortage: number;
}

export interface SkippedAllocationResponse {
  warehouseId: string;
  productId: string;
  reasonCode: AllocationReasonCode;
  message: string;
}

export interface AllocationResponse {
  status: AllocationStatus;
  allocations: WarehouseAllocationResponse[];
  lines: AllocationLineResponse[];
  totalDistanceKm: number;
  warehouseCount: number;
  explanation: string;
  skipped: SkippedAllocationResponse[];
}
