"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { AllocationResponse, ProductResponse } from "@simpul/shared";
import styles from "./allocation-results.module.css";

type ResultsTab = "allocation" | "skipped";

interface AllocationResultsProps {
  allocation: AllocationResponse | null;
  products: ProductResponse[];
}

function formatDistance(distanceKm: number): string {
  return Number.isInteger(distanceKm) ? String(distanceKm) : String(Number(distanceKm.toFixed(2)));
}

export default function AllocationResults({ allocation, products }: AllocationResultsProps) {
  const [activeTab, setActiveTab] = useState<ResultsTab>("allocation");
  const [showNoStock, setShowNoStock] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function moveTabFocus(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % 2;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex + 1) % 2;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    setActiveTab(nextIndex === 0 ? "allocation" : "skipped");
    tabRefs.current[nextIndex]?.focus();
  }

  const tabs: Array<{ id: ResultsTab; label: string; count?: number }> = [
    { id: "allocation", label: "Allocation" },
    { id: "skipped", label: "Skipped", count: allocation?.skipped.length ?? 0 },
  ];

  const productNames = new Map(products.map((product) => [product.id, product.name]));
  const skippedByProduct = new Map<string, AllocationResponse["skipped"]>();
  for (const skipped of allocation?.skipped ?? []) {
    const entries = skippedByProduct.get(skipped.productId) ?? [];
    entries.push(skipped);
    skippedByProduct.set(skipped.productId, entries);
  }
  const visibleSkippedByProduct = [...skippedByProduct.entries()]
    .map(([productId, entries]) => ({
      productId,
      productName: productNames.get(productId) ?? productId,
      entries: showNoStock ? entries : entries.filter((entry) => entry.reasonCode !== "NO_STOCK"),
    }))
    .filter(({ entries }) => entries.length > 0);

  return (
    <section className={styles.section} aria-labelledby="allocation-title" aria-live="polite">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>FULFILMENT / RESULTS</p>
          <h2 id="allocation-title">Allocation</h2>
        </div>
        <span className={styles.stepMark}>02 <span>/ 02</span></span>
      </div>

      {!allocation ? (
        <p className={styles.emptyHint}>Submit an order to see the allocation decision, shipment distance, and warehouse breakdown here.</p>
      ) : (
        <>
          <div className={styles.decisionHeader}>
            <span className={`${styles.status} ${styles[allocation.status.toLowerCase()]}`}>
              {allocation.status}
            </span>
            <p className={styles.explanation}>{allocation.explanation}</p>
            <dl className={styles.metrics}>
              <div><dt>Total distance</dt><dd>{formatDistance(allocation.totalDistanceKm)} <span>km</span></dd></div>
              <div><dt>Warehouses</dt><dd>{allocation.warehouseCount}</dd></div>
            </dl>
          </div>

          <div className={styles.tabs} role="tablist" aria-label="Allocation result details">
            {tabs.map((tab, index) => (
              <button
                aria-controls={`${tab.id}-panel`}
                aria-selected={activeTab === tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ""}`}
                id={`${tab.id}-tab`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => moveTabFocus(event, index)}
                ref={(element) => { tabRefs.current[index] = element; }}
                role="tab"
                tabIndex={activeTab === tab.id ? 0 : -1}
                type="button"
              >
                {tab.label}{tab.count !== undefined && <span className={styles.tabCount}>{tab.count}</span>}
              </button>
            ))}
          </div>

          {activeTab === "allocation" ? (
            <div aria-labelledby="allocation-tab" className={styles.panel} id="allocation-panel" role="tabpanel" tabIndex={0}>
              <div className={styles.summaryHeading}><h3>Product summary</h3><span>{allocation.lines.length} products</span></div>
              <div className={styles.summaryTable}>
                <div className={styles.summaryHeader} aria-hidden="true"><span>Product</span><span>Requested</span><span>Fulfilled</span><span>Shortage</span></div>
                {allocation.lines.map((line) => (
                  <div className={styles.summaryRow} key={line.productId}>
                    <span className={styles.productName}>{productNames.get(line.productId) ?? line.productId}</span>
                    <span>{line.requested}</span>
                    <span>{line.fulfilled}</span>
                    <span className={line.shortage > 0 ? styles.shortage : ""}>{line.shortage}</span>
                  </div>
                ))}
              </div>

              <div className={styles.warehouseHeading}><h3>Shipping from</h3><span>{allocation.allocations.length} {allocation.allocations.length === 1 ? "warehouse" : "warehouses"}</span></div>
              {allocation.allocations.length === 0 ? (
                <p className={styles.noWarehouses}>No warehouse can ship this order.</p>
              ) : (
                <div className={styles.warehouseList}>
                  {allocation.allocations.map((warehouse) => (
                    <article className={styles.warehouse} key={warehouse.warehouseId}>
                      <div className={styles.warehouseTop}>
                        <div><h4>{warehouse.warehouseId}</h4><p>{warehouse.city}</p></div>
                        <span className={styles.distance}>{formatDistance(warehouse.distanceKm)} km</span>
                      </div>
                      <ul className={styles.shippedItems}>
                        {warehouse.items.map((item) => (
                          <li key={item.productId}><span>{item.productName}</span><strong>{item.quantity}</strong></li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div aria-labelledby="skipped-tab" className={styles.panel} id="skipped-panel" role="tabpanel" tabIndex={0}>
              <label className={styles.noStockToggle}>
                <input checked={showNoStock} onChange={(event) => setShowNoStock(event.target.checked)} type="checkbox" />
                <span>Show NO_STOCK entries</span>
              </label>
              {visibleSkippedByProduct.length === 0 ? (
                <p className={styles.emptySkipped}>{showNoStock || allocation.skipped.length === 0 ? "No warehouses were skipped." : "No non-stock exclusions. Turn on the toggle to show NO_STOCK entries."}</p>
              ) : (
                <div className={styles.skippedGroups}>
                  {visibleSkippedByProduct.map((group) => (
                    <section className={styles.skippedGroup} key={group.productId} aria-label={`Skipped warehouses for ${group.productName}`}>
                      <h3>{group.productName}</h3>
                      <ul>
                        {group.entries.map((entry) => (
                          <li className={styles.skippedEntry} key={`${entry.warehouseId}-${entry.reasonCode}`}>
                            <div><strong>{entry.warehouseId}</strong><span className={styles.reasonCode}>{entry.reasonCode}</span></div>
                            <p>{entry.message}</p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}