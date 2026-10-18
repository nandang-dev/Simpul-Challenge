"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { AllocationRequest, AllocationResponse, ProductResponse } from "@simpul/shared";
import styles from "./order-form.module.css";

interface OrderLineDraft {
  key: number;
  productId: string;
  quantity: string;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const examples: Array<{ label: string; request: AllocationRequest }> = [
  { label: "Vaccine, near warehouse lacks refrigerated vans", request: { items: [{ productId: "P002", quantity: 30 }] } },
  { label: "Mixed order", request: { items: [{ productId: "P002", quantity: 50 }, { productId: "P001", quantity: 100 }] } },
  { label: "Split is closer than one warehouse", request: { items: [{ productId: "P001", quantity: 400 }] } },
  { label: "Same order with 60 km tolerance", request: { items: [{ productId: "P001", quantity: 400 }], distanceToleranceKm: 60 } },
  { label: "Not enough safe stock", request: { items: [{ productId: "P004", quantity: 200 }] } },
];

function getApiMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("message" in payload)) return undefined;
  const message = payload.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.every((item) => typeof item === "string")) return message.join(" ");
  return undefined;
}

export default function OrderForm() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [productsLoading, setProductsLoading] = useState(Boolean(apiBaseUrl));
  const [productsError, setProductsError] = useState("");
  const [lines, setLines] = useState<OrderLineDraft[]>([{ key: 1, productId: "", quantity: "1" }]);
  const nextLineKey = useRef(2);
  const [distanceTolerance, setDistanceTolerance] = useState("0");
  const [maxDistance, setMaxDistance] = useState("");
  const [formError, setFormError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allocation, setAllocation] = useState<AllocationResponse | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }
    const controller = new AbortController();
    fetch(`${apiBaseUrl}/products`, { signal: controller.signal })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(getApiMessage(payload) ?? `API merespons dengan status ${response.status}.`);
        if (!Array.isArray(payload)) throw new Error("Respons daftar produk dari API tidak valid.");
        setProducts(payload as ProductResponse[]);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setProductsError(error instanceof Error ? `Produk gagal dimuat: ${error.message}` : "Produk gagal dimuat. Periksa koneksi ke API.");
      })
      .finally(() => setProductsLoading(false));
    return () => controller.abort();
  }, []);

  function fillExample(example: AllocationRequest) {
    setLines(example.items.map((item) => ({ key: nextLineKey.current++, productId: item.productId, quantity: String(item.quantity) })));
    setDistanceTolerance(String(example.distanceToleranceKm ?? 0));
    setMaxDistance(example.maxDistanceKm === undefined ? "" : String(example.maxDistanceKm));
    setFormError("");
    setRequestError("");
    setAllocation(null);
  }

  function updateLine(key: number, patch: Partial<OrderLineDraft>) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
    setAllocation(null);
    setRequestError("");
  }

  function validateForm(): string | undefined {
    if (lines.length < 1) return "Tambahkan setidaknya satu produk.";
    if (lines.some((line) => !line.productId)) return "Pilih produk untuk setiap baris.";
    if (new Set(lines.map((line) => line.productId)).size !== lines.length) return "Setiap produk hanya boleh dipilih satu kali.";
    if (lines.some((line) => !/^\d+$/.test(line.quantity) || Number(line.quantity) <= 0)) return "Jumlah setiap produk harus berupa bilangan bulat positif.";
    if (!Number.isFinite(Number(distanceTolerance)) || Number(distanceTolerance) < 0) return "Toleransi jarak harus bernilai 0 atau lebih.";
    if (maxDistance !== "" && (!Number.isFinite(Number(maxDistance)) || Number(maxDistance) <= 0)) return "Jarak maksimum harus lebih besar dari 0, atau dikosongkan tanpa batas.";
    return undefined;
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setRequestError("");
    setAllocation(null);
    const validationError = validateForm();
    if (validationError) return setFormError(validationError);
    if (!apiBaseUrl) return setRequestError("NEXT_PUBLIC_API_URL belum diatur. Permintaan tidak dapat dikirim.");

    const requestBody: AllocationRequest = {
      items: lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })),
      distanceToleranceKm: Number(distanceTolerance),
      ...(maxDistance === "" ? {} : { maxDistanceKm: Number(maxDistance) }),
    };
    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getApiMessage(payload) ?? `API merespons dengan status ${response.status}.`);
      setAllocation(payload as AllocationResponse);
    } catch (error: unknown) {
      setRequestError(error instanceof Error ? `Permintaan gagal: ${error.message}` : "Permintaan gagal. Periksa koneksi ke API.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.masthead}>
        <a className={styles.wordmark} href="#order">simpul<span>.</span></a>
        <div className={styles.mastheadMeta}><span>OPERATIONS</span><span>ORDER ALLOCATION</span></div>
      </header>
      <div className={styles.content}>
        <section className={styles.formSection} id="order" aria-labelledby="page-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>FULFILMENT / NEW REQUEST</p><h1 id="page-title">Build an order</h1><p className={styles.lede}>Choose products and quantities. The allocation service will find a safe shipping plan.</p></div>
            <span className={styles.stepMark}>01 <span>/ 02</span></span>
          </div>
          <div className={styles.examples} aria-label="Example orders">
            <p className={styles.examplesLabel}>TRY AN EXAMPLE</p>
            <div className={styles.exampleButtons}>
              {examples.map((example) => <button className={styles.exampleButton} key={example.label} onClick={() => fillExample(example.request)} type="button">{example.label}</button>)}
            </div>
          </div>
          {(productsError || !apiBaseUrl) && <p className={styles.errorBanner} role="alert">{productsError || "NEXT_PUBLIC_API_URL belum diatur. Produk tidak dapat dimuat."}</p>}
          <form className={styles.orderForm} onSubmit={submitOrder} noValidate>
            <div className={styles.formHeading}><h2>Order lines</h2><span>{lines.length} {lines.length === 1 ? "line" : "lines"}</span></div>
            <div className={styles.lineList}>
              {lines.map((line, index) => {
                const alreadySelected = new Set(lines.filter((other) => other.key !== line.key).map((other) => other.productId));
                const availableProducts = products.filter((product) => product.id === line.productId || !alreadySelected.has(product.id));
                const selectedProduct = products.find((product) => product.id === line.productId);
                return (
                  <div className={styles.orderLine} key={line.key}>
                    <span className={styles.lineNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <div className={styles.productField}>
                      <label htmlFor={`product-${line.key}`}>Product</label>
                      <select id={`product-${line.key}`} value={line.productId} onChange={(event) => updateLine(line.key, { productId: event.target.value })} disabled={productsLoading || products.length === 0}>
                        <option value="">{productsLoading ? "Loading products…" : "Select a product"}</option>
                        {line.productId && !selectedProduct && <option value={line.productId}>{line.productId} · product details unavailable</option>}
                        {availableProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.unit}</option>)}
                      </select>
                      {selectedProduct && <span className={styles.productMeta}>{selectedProduct.requiresColdChain ? "Cold-chain handling" : "Standard handling"}</span>}
                    </div>
                    <div className={styles.quantityField}>
                      <label htmlFor={`quantity-${line.key}`}>Quantity</label>
                      <input id={`quantity-${line.key}`} type="number" min="1" step="1" inputMode="numeric" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} />
                    </div>
                    <button aria-label={`Remove line ${index + 1}`} className={styles.removeButton} disabled={lines.length === 1} onClick={() => setLines((current) => current.length > 1 ? current.filter((item) => item.key !== line.key) : current)} type="button">Remove</button>
                  </div>
                );
              })}
            </div>
            <button className={styles.addButton} onClick={() => setLines((current) => [...current, { key: nextLineKey.current++, productId: "", quantity: "1" }])} type="button"><span aria-hidden="true">+</span> Add product</button>
            <details className={styles.advanced}>
              <summary>Advanced distance settings</summary>
              <div className={styles.advancedFields}>
                <div><label htmlFor="distance-tolerance">Distance tolerance <span>(km)</span></label><input id="distance-tolerance" type="number" min="0" step="any" value={distanceTolerance} onChange={(event) => setDistanceTolerance(event.target.value)} /><p>Allows a farther plan when it uses fewer warehouses.</p></div>
                <div><label htmlFor="max-distance">Maximum warehouse distance <span>(km)</span></label><input id="max-distance" type="number" min="0" step="any" placeholder="No limit" value={maxDistance} onChange={(event) => setMaxDistance(event.target.value)} /><p>Leave empty for no distance limit.</p></div>
              </div>
            </details>
            {formError && <p className={styles.errorBanner} role="alert">{formError}</p>}
            {requestError && <p className={styles.errorBanner} role="alert">{requestError}</p>}
            <div className={styles.submitRow}><p>Allocation rules are applied by the API.</p><button className={styles.submitButton} disabled={isSubmitting || productsLoading || products.length === 0} type="submit">{isSubmitting ? "Allocating…" : "Allocate order"}<span aria-hidden="true">↗</span></button></div>
          </form>
          {allocation && <div className={styles.successNotice} role="status"><strong>Allocation received</strong><span>The API returned a {allocation.status.toLowerCase()} plan. The allocation view is the next phase.</span></div>}
        </section>
        <section className={styles.nextSection} aria-labelledby="allocation-title">
          <div className={styles.nextHeading}><div><p className={styles.eyebrow}>FULFILMENT / RESULTS</p><h2 id="allocation-title">Allocation</h2></div><span className={styles.stepMark}>02 <span>/ 02</span></span></div>
          <p className={styles.emptyHint}>Submit an order to see the allocation decision, shipment distance, and warehouse breakdown here.</p>
        </section>
      </div>
      <footer className={styles.footer}><span>SIMPUL / INVENTORY OPERATIONS</span><span>API-DRIVEN ALLOCATION</span></footer>
    </main>
  );
}