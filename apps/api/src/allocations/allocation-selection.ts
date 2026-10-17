import type {
  AllocationReasonCode,
  AllocationResponse,
} from '@simpul/shared';
import type {
  SelectionOrder,
  SelectionProduct,
  SelectionWarehouse,
} from './selection.types';

interface EligibleWarehouse {
  warehouse: SelectionWarehouse;
  quantities: Map<string, number>;
}

interface Candidate {
  allocations: Map<string, Map<string, number>>;
  warehouseIds: string[];
  totalDistanceKm: number;
}

interface EligibilityResult {
  eligibleWarehouses: EligibleWarehouse[];
  skipped: AllocationResponse['skipped'];
  sortedWarehouses: SelectionWarehouse[];
}

interface RankingResult {
  chosen?: Candidate;
  bestSingleWarehouse?: Candidate;
  minimumDistanceKm: number;
  toleranceChangedSelection: boolean;
}

export function selectWarehouses(
  order: SelectionOrder,
  products: SelectionProduct[],
  warehouses: SelectionWarehouse[],
): AllocationResponse {
  const productsById = new Map(products.map((product) => [product.id, product]));
  validateOrderProducts(order, productsById);
  const eligibility = evaluateEligibility(order, productsById, warehouses);
  const targets = calculateTargets(order, eligibility.eligibleWarehouses);
  const candidates = generateCandidates(order, eligibility.eligibleWarehouses, targets);
  const ranking = rankCandidates(candidates, order.distanceToleranceKm ?? 0);

  return buildResponse(order, productsById, eligibility, ranking);
}

function validateOrderProducts(
  order: SelectionOrder,
  productsById: Map<string, SelectionProduct>,
): void {
  for (const item of order.items) {
    if (!productsById.has(item.productId)) {
      throw new Error(`Product not found: ${item.productId}`);
    }
  }
}

function evaluateEligibility(
  order: SelectionOrder,
  productsById: Map<string, SelectionProduct>,
  warehouses: SelectionWarehouse[],
): EligibilityResult {
  const skipped: AllocationResponse['skipped'] = [];
  const eligibleWarehouses: EligibleWarehouse[] = [];
  const sortedWarehouses = [...warehouses].toSorted((first, second) =>
    first.id.localeCompare(second.id),
  );

  for (const warehouse of sortedWarehouses) {
    const eligibleQuantities = new Map<string, number>();

    for (const item of order.items) {
      const stockQuantity = warehouse.stock
        .filter((stock) => stock.productId === item.productId)
        .reduce((total, stock) => total + stock.quantity, 0);
      const reasonCode = getIneligibilityReason(
        stockQuantity,
        productsById.get(item.productId),
        warehouse,
        order.maxDistanceKm,
      );

      if (reasonCode) {
        skipped.push({
          warehouseId: warehouse.id,
          productId: item.productId,
          reasonCode,
          message: describeIneligibility(reasonCode, productsById.get(item.productId)!, warehouse, order.maxDistanceKm),
        });
        continue;
      }

      eligibleQuantities.set(item.productId, stockQuantity);
    }

    if (eligibleQuantities.size > 0) {
      eligibleWarehouses.push({ warehouse, quantities: eligibleQuantities });
    }
  }

  return { eligibleWarehouses, skipped, sortedWarehouses };
}

function calculateTargets(
  order: SelectionOrder,
  eligibleWarehouses: EligibleWarehouse[],
): Map<string, number> {
  return new Map(order.items.map((item) => {
    const totalEligibleStock = eligibleWarehouses
      .reduce((total, { quantities }) => total + (quantities.get(item.productId) ?? 0), 0);
    return [item.productId, Math.min(item.quantity, totalEligibleStock)];
  }));
}

function generateCandidates(
  order: SelectionOrder,
  eligibleWarehouses: EligibleWarehouse[],
  targets: Map<string, number>,
): Candidate[] {
  const candidates: Candidate[] = [];
  for (const combination of warehouseCombinations(eligibleWarehouses)) {
    const candidate = buildCandidate(combination, order, targets);
    if (candidate) {
      candidates.push(candidate);
    }
  }
  return candidates;
}

function rankCandidates(candidates: Candidate[], tolerance: number): RankingResult {
  const minimumDistance = candidates.length > 0
    ? Math.min(...candidates.map((candidate) => candidate.totalDistanceKm))
    : 0;
  const baseline = candidates
    .filter((candidate) => candidate.totalDistanceKm === minimumDistance)
    .toSorted(compareCandidates)[0];
  const chosen = candidates
    .filter((candidate) => candidate.totalDistanceKm <= minimumDistance + tolerance)
    .toSorted(compareCandidates)[0];
  return {
    chosen,
    bestSingleWarehouse: candidates
      .filter((candidate) => candidate.warehouseIds.length === 1)
      .toSorted(compareCandidates)[0],
    minimumDistanceKm: minimumDistance,
    toleranceChangedSelection: chosen !== baseline,
  };
}

function buildResponse(
  order: SelectionOrder,
  productsById: Map<string, SelectionProduct>,
  eligibility: EligibilityResult,
  ranking: RankingResult,
): AllocationResponse {
  const { chosen } = ranking;
  const fulfilledByProduct = new Map<string, number>();
  if (chosen) {
    for (const productQuantities of chosen.allocations.values()) {
      for (const [productId, quantity] of productQuantities) {
        fulfilledByProduct.set(productId, (fulfilledByProduct.get(productId) ?? 0) + quantity);
      }
    }
  }

  const lines = order.items.map((item) => {
    const fulfilled = fulfilledByProduct.get(item.productId) ?? 0;
    return {
      productId: item.productId,
      requested: item.quantity,
      fulfilled,
      shortage: item.quantity - fulfilled,
    };
  });
  const totalFulfilled = lines.reduce((total, line) => total + line.fulfilled, 0);
  const status = totalFulfilled === 0
    ? 'UNFULFILLABLE'
    : lines.every((line) => line.fulfilled === line.requested)
      ? 'FULL'
      : 'PARTIAL';
  const selectedWarehouses = chosen
    ? eligibility.sortedWarehouses.filter((warehouse) => chosen.allocations.has(warehouse.id))
    : [];
  const allocations = selectedWarehouses.map((warehouse) => ({
    warehouseId: warehouse.id,
    city: warehouse.city,
    distanceKm: warehouse.distanceKm,
    items: order.items.flatMap((item) => {
      const quantity = chosen?.allocations.get(warehouse.id)?.get(item.productId) ?? 0;
      if (quantity <= 0) {
        return [];
      }
      return [{
        productId: item.productId,
        productName: productsById.get(item.productId)!.name,
        quantity,
      }];
    }),
  }));

  return {
    status,
    allocations,
    lines,
    totalDistanceKm: chosen?.totalDistanceKm ?? 0,
    warehouseCount: allocations.length,
    explanation: describeSelection({
      order,
      productsById,
      chosen,
      bestSingleWarehouse: ranking.bestSingleWarehouse,
      minimumDistanceKm: ranking.minimumDistanceKm,
      toleranceChangedSelection: ranking.toleranceChangedSelection,
      eligibleWarehouseIds: eligibility.eligibleWarehouses.map(({ warehouse }) => warehouse.id),
      skippedWarehouseIds: [...new Set(eligibility.skipped.map(({ warehouseId }) => warehouseId))],
      skipped: eligibility.skipped,
      status,
      lines,
    }),
    skipped: eligibility.skipped,
  };
}

function getIneligibilityReason(
  stockQuantity: number,
  product: SelectionProduct | undefined,
  warehouse: SelectionWarehouse,
  maxDistanceKm: number | undefined,
): AllocationReasonCode | undefined {
  if (stockQuantity <= 0) {
    return 'NO_STOCK';
  }
  if (product?.requiresColdChain && !warehouse.hasColdStorage) {
    return 'NO_COLD_STORAGE';
  }
  if (product?.requiresColdChain && !warehouse.hasRefrigeratedFleet) {
    return 'NO_REFRIGERATED_FLEET';
  }
  if (maxDistanceKm !== undefined && maxDistanceKm > 0 && warehouse.distanceKm > maxDistanceKm) {
    return 'BEYOND_MAX_DISTANCE';
  }
  return undefined;
}

function describeIneligibility(
  reasonCode: AllocationReasonCode,
  product: SelectionProduct,
  warehouse: SelectionWarehouse,
  maxDistanceKm: number | undefined,
): string {
  switch (reasonCode) {
    case 'NO_STOCK':
      return `Warehouse ${warehouse.id} has no available stock of ${product.name}.`;
    case 'NO_COLD_STORAGE':
      return `Warehouse ${warehouse.id} has no cold storage for ${product.name}.`;
    case 'NO_REFRIGERATED_FLEET':
      return `Warehouse ${warehouse.id} has no refrigerated fleet to deliver ${product.name}.`;
    case 'BEYOND_MAX_DISTANCE':
      return `Warehouse ${warehouse.id} is ${formatNumber(warehouse.distanceKm)} km away, beyond the ${formatNumber(maxDistanceKm!)} km maximum.`;
  }
}

function* warehouseCombinations(
  warehouses: EligibleWarehouse[],
  start = 0,
  selected: EligibleWarehouse[] = [],
): Generator<EligibleWarehouse[]> {
  for (let index = start; index < warehouses.length; index += 1) {
    const combination = [...selected, warehouses[index]];
    yield combination;
    yield* warehouseCombinations(warehouses, index + 1, combination);
  }
}

function buildCandidate(
  warehouses: EligibleWarehouse[],
  order: SelectionOrder,
  targets: Map<string, number>,
): Candidate | undefined {
  const allocations = new Map<string, Map<string, number>>();

  for (const item of order.items) {
    const target = targets.get(item.productId) ?? 0;
    if (target === 0) {
      continue;
    }

    const suppliers = warehouses
      .filter(({ quantities }) => (quantities.get(item.productId) ?? 0) > 0)
      .toSorted((first, second) =>
        first.warehouse.distanceKm - second.warehouse.distanceKm ||
        first.warehouse.id.localeCompare(second.warehouse.id),
      );
    const singleWarehouse = suppliers.find(
      ({ quantities }) => (quantities.get(item.productId) ?? 0) >= target,
    );

    if (singleWarehouse) {
      addQuantity(allocations, singleWarehouse.warehouse.id, item.productId, target);
      continue;
    }

    let remaining = target;
    for (const supplier of suppliers) {
      const quantity = Math.min(supplier.quantities.get(item.productId) ?? 0, remaining);
      if (quantity > 0) {
        addQuantity(allocations, supplier.warehouse.id, item.productId, quantity);
        remaining -= quantity;
      }
      if (remaining === 0) {
        break;
      }
    }

    if (remaining > 0) {
      return undefined;
    }
  }

  if (allocations.size !== warehouses.length) {
    return undefined;
  }

  const warehouseIds = [...allocations.keys()].toSorted((first, second) => first.localeCompare(second));
  const totalDistanceKm = warehouses
    .filter(({ warehouse }) => allocations.has(warehouse.id))
    .reduce((total, { warehouse }) => total + warehouse.distanceKm, 0);

  return { allocations, warehouseIds, totalDistanceKm };
}

function addQuantity(
  allocations: Map<string, Map<string, number>>,
  warehouseId: string,
  productId: string,
  quantity: number,
): void {
  const warehouseAllocations = allocations.get(warehouseId) ?? new Map<string, number>();
  warehouseAllocations.set(productId, (warehouseAllocations.get(productId) ?? 0) + quantity);
  allocations.set(warehouseId, warehouseAllocations);
}

function compareCandidates(first: Candidate, second: Candidate): number {
  return first.warehouseIds.length - second.warehouseIds.length ||
    first.totalDistanceKm - second.totalDistanceKm ||
    first.warehouseIds.join('\0').localeCompare(second.warehouseIds.join('\0'));
}

interface ExplanationContext {
  order: SelectionOrder;
  productsById: Map<string, SelectionProduct>;
  chosen?: Candidate;
  bestSingleWarehouse?: Candidate;
  minimumDistanceKm: number;
  toleranceChangedSelection: boolean;
  eligibleWarehouseIds: string[];
  skippedWarehouseIds: string[];
  skipped: AllocationResponse['skipped'];
  status: AllocationResponse['status'];
  lines: AllocationResponse['lines'];
}

function describeSelection(context: ExplanationContext): string {
  return [
    describePlan(context),
    describeTolerance(context),
    describeUnusedEligibleWarehouses(context),
    describeColdChainExclusions(context),
    describeShortages(context),
  ].filter(Boolean).join(' ');
}

function describePlan(context: ExplanationContext): string {
  const { chosen, bestSingleWarehouse } = context;
  if (!chosen) {
    return 'No eligible warehouse combination could supply any requested quantity.';
  }
  if (chosen.warehouseIds.length === 1) {
    return `The order uses one warehouse (${chosen.warehouseIds[0]}), which supplied all available requested quantities. Total shipment distance is ${formatNumber(chosen.totalDistanceKm)} km.`;
  }
  if (!bestSingleWarehouse) {
    return `The order is split across ${formatNaturalList(chosen.warehouseIds)} because no single warehouse can send the whole order. Total shipment distance is ${formatNumber(chosen.totalDistanceKm)} km.`;
  }
  return `The order is split across ${formatNaturalList(chosen.warehouseIds)} at ${formatNumber(chosen.totalDistanceKm)} km in total, shorter than ${formatNaturalList(bestSingleWarehouse.warehouseIds)} alone at ${formatNumber(bestSingleWarehouse.totalDistanceKm)} km.`;
}

function describeTolerance(context: ExplanationContext): string {
  if ((context.order.distanceToleranceKm ?? 0) <= 0) {
    return '';
  }
  if (context.toleranceChangedSelection && context.chosen) {
    return `Distance tolerance changed the selection, allowing this ${formatNumber(context.chosen.totalDistanceKm)} km plan instead of the ${formatNumber(context.minimumDistanceKm)} km minimum-distance plan.`;
  }
  return 'Distance tolerance did not change the selected plan.';
}

function describeUnusedEligibleWarehouses(context: ExplanationContext): string {
  const unusedEligibleWarehouses = context.eligibleWarehouseIds.filter((warehouseId) =>
    !context.chosen?.allocations.has(warehouseId) && !context.skippedWarehouseIds.includes(warehouseId),
  );
  if (unusedEligibleWarehouses.length === 0 || context.toleranceChangedSelection) {
    return '';
  }
  return 'Other eligible warehouses were not used because this plan has the shortest total distance.';
}

function describeColdChainExclusions(context: ExplanationContext): string {
  const exclusions = new Map<string, Map<AllocationReasonCode, string[]>>();
  for (const skipped of context.skipped) {
    if (skipped.reasonCode !== 'NO_COLD_STORAGE' && skipped.reasonCode !== 'NO_REFRIGERATED_FLEET') {
      continue;
    }
    const reasons = exclusions.get(skipped.productId) ?? new Map<AllocationReasonCode, string[]>();
    const warehouses = reasons.get(skipped.reasonCode) ?? [];
    warehouses.push(skipped.warehouseId);
    reasons.set(skipped.reasonCode, warehouses);
    exclusions.set(skipped.productId, reasons);
  }
  const summaries: string[] = [];
  for (const [productId, reasons] of exclusions) {
    const productName = context.productsById.get(productId)!.name;
    for (const [reason, warehouseIds] of reasons) {
      const cause = reason === 'NO_COLD_STORAGE' ? 'no cold storage' : 'no refrigerated fleet';
      const isSingle = warehouseIds.length === 1;
      const subject = formatNaturalList(warehouseIds);
      const verb = isSingle ? 'was' : 'were';
      const pronoun = isSingle ? 'it has' : 'they have';
      summaries.push(`${subject} ${verb} skipped for ${productName} because ${pronoun} ${cause}.`);
    }
  }
  return summaries.join(' ');
}

function describeShortages(context: ExplanationContext): string {
  if (context.status === 'UNFULFILLABLE') {
    return 'No requested quantities could be fulfilled.';
  }
  if (context.status !== 'PARTIAL') {
    return '';
  }
  const shortages = context.lines
    .filter((line) => line.shortage > 0)
    .map((line) => {
      const product = context.productsById.get(line.productId)!;
      return `${formatNumber(line.shortage)} × ${product.unit} of ${product.name}`;
    });
  return `The request is partially fulfilled; it is short ${formatNaturalList(shortages)}.`;
}

function formatNaturalList(values: string[]): string {
  if (values.length < 2) {
    return values[0] ?? '';
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}