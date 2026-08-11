# Order vs Dispatch Module — Architecture Inventory

> **Module nav id:** `dispatch`
> **Status:** Functional — fully built with real API; dispatch quantities are simulated (not from real ASN/shipment data)
> **Source:** `app/page.js` → `OrderDispatchPage` component (lines ~2085–2316)
> **API endpoint:** `GET /api/orders/dispatch-visibility?distributorId=X`
> **Last audited:** 2026-08-10

---

## 1. Purpose

Order vs Dispatch Visibility — surfaces the execution gap between what a distributor ordered (primary sell-in) and what was actually dispatched from boAt. Provides a per-SKU breakdown with ordered qty, dispatched qty, gap, and fulfillment status. Answers the question: "Did the factory actually ship what the distributor ordered?"

---

## 2. Build Status

**Functional.** The API is real and reads placed orders from the Distributor Orders persistent store. However, dispatch quantities are **simulated** — the backend computes a dispatch rate using last-week `primary ÷ secondary` (factory-to-distributor vs distributor-to-retail) as a supply adequacy proxy, plus deterministic SKU-level variance and tier-based service rates. The comment at line 2307 explicitly documents this as a "POC stand-in for ASN / shipment confirmations."

---

## 3. Data Entities Read

| Endpoint | Data returned | Notes |
|---|---|---|
| `/api/orders/dispatch-visibility?distributorId=X` | `rows[]` — per-SKU: `skuId`, `skuName`, `orderedQty`, `dispatchedQty`, `gap`, `status` (Fully fulfilled / Partial / Pending); `summary{}` — `totalOrdered`, `totalDispatched`, `fulfilmentPct`, `totalGap`, `byStatus{}`; `dataSource` (placed_orders / suggested_pipeline); `dataSourceHint` | Execution table + BarChart + KPI strip |
| `/api/data/distributors` | `id`, `name`, `region`, `tier` | Distributor selector dropdown |

**Writes:** None — read-only view.

**Dispatch computation (backend):** The API reads from the placed-orders store (if orders exist for the distributor) or falls back to the suggested pipeline. It then applies: `fulfilmentRate = (primary/secondary ratio for last week) × (1 + SKU_variance) × tierServiceFactor(A/B/C)` to compute `dispatchedQty` per SKU. This is explicitly a simulation.

---

## 4. Key UI Components / Widgets

| Widget | Description |
|---|---|
| Distributor `<Select>` + Refresh button | Loads dispatch visibility for selected distributor |
| Data source hint card | Shows whether the view is based on "Placed orders" or "Suggested pipeline" fallback |
| 4× `KpiCard` | Ordered units, Dispatched (sim.) units, Execution gap (gap = ordered − dispatched), Line status mix (Fulfilled / Partial / Pending counts) |
| `BarChart` (grouped, Recharts) | Top 14 SKUs by ordered qty — Ordered (blue) vs Dispatched (green) grouped bars |
| SKU execution table | Per-SKU: ordered qty, dispatched qty, gap (rose text if gap > 0), status badge — amber row highlight for rows with gap |
| Simulation explanation card | Static note explaining dispatch simulation methodology |

---

## 5. Overlap / Relationship with Other Modules

| Module | Relationship — this is a critical dependency chain |
|---|---|
| **Distributor Orders** | **Direct upstream.** Order vs Dispatch reads the orders placed via Distributor Orders. Without any placed orders, it falls back to the suggested pipeline. The execution gap is only meaningful when orders have been placed. |
| **Demand Planning** | Together, these two modules provide a partial "Continuous Demand vs Supply View": Demand Planning shows demand actuals vs forecast; Order vs Dispatch shows supply execution (ordered vs dispatched). There is **no unified view** combining both into a rolling demand-vs-supply panel. |
| **Supply Planning → Network & Transfers** | Network & Transfers shows stock coverage and DOS across DCs. Order vs Dispatch shows the execution gap that determines whether DC stock will be replenished. No data linkage currently. |
| **Supply Planning → Procurement POs** | Procurement POs tracks the factory-side: ODM/EMS vendor → boAt. Order vs Dispatch tracks the distribution side: boAt → distributor. Together they describe the full supply chain execution pipeline, but they are not linked — the fulfilled dispatch qty here does not flow back into Supply Planning as received inventory. |

---

## 6. BOAT Requirement Mapping & Coverage Assessment

| BOAT Requirement | Coverage Status | Specific Resolution & Notes |
|---|---|---|
| **S&OP Portal #3: Dashboards - Forecast vs Net Supply vs Operating Plan** | **Partially Satisfied (Net Supply Gap)** | Order vs Dispatch **satisfies the Net Supply execution gap** (Ordered vs Dispatched fulfillment) portion of this requirement. The Forecast portion is in `Demand Planning`, and Operating Plan netting is in `Supply Planning Studio`. |
| **Supply Planning #7: Continuous Demand vs Supply View — Short/Medium Term** | **Partially Satisfied (Supply Execution)** | Provides the primary supply dispatch execution signal per distributor. |

### Detailed Breakdown of "Continuous Demand vs Supply View"

| Dimension | Covered by | What exists |
|---|---|---|
| Demand (Tertiary actuals vs Forecast) | Demand Planning tab | Actual vs Forecast LineChart — 26 weeks |
| Supply execution (Order vs Dispatch) | This tab | Ordered vs Dispatched (simulated) — per distributor, not time-phased |
| Supply availability (MRP netting) | Supply Planning Studio | 52-week MRP grid — separate application |
| Channel stock / DOS | Not built | No channel stock DOS view in current tabs |
| Unified rolling demand-vs-supply panel | **Not built** | Nothing combines all four signals into a single continuous view |

The gap is significant: **no single tab shows demand signal + supply signal on the same timeline.** This is a Tier 1 gap in the roadmap.

---

## 7. Inventory Planning Gap Note

There is no Inventory Planning nav tab. The channel stock / DOS dimension of the "Continuous Demand vs Supply View" (which is the inventory position layer) is not represented anywhere in the current S&OP Suite. This gap is explicitly called out in the data model design (`docs/modules/supply-planning.md`, Section 3).
