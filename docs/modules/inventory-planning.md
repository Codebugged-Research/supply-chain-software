# Inventory Planning Module — Architecture Inventory

> **Module nav id:** `inventory`  
> **Status:** 🟢 **Planning workbench built** — segmentation, optimized norms, reorder recommendations, stocking scenarios, and inventory-health review are available in the active application.  
> **Last audited:** 2026-08-11

---

## 1. Purpose and ownership

Inventory Planning governs the rolled-up inventory policy and replenishment decision for each SKU: ABC/XYZ segment, service level, safety stock, target days of supply (DOS), reorder point, order recommendation, projected inventory, and health exceptions.

Demand Planning continues to own SKU × channel-partner DOS norms. Inventory Planning owns the overall SKU policy used for inventory and supply decisions. Supply Planning remains the system of record for supplier-product lead times and open purchase orders.

---

## 2. Implemented experience

`InventoryPlanningPage` and `InventoryAdvancedPlanningTabs` in `app/page.js` provide:

- KPI cards for segmented SKUs, effective safety stock, inventory exceptions, and erratic demand.
- An interactive 3 × 3 ABC/XYZ segmentation matrix with category and segment cuts.
- A norm policy workbench showing system suggestions beside effective planner overrides.
- **Reorder Recommendations:** weekly, monthly, and on-request review modes; open-PO netting; recommended quantity/date; MOQ and order-multiple rounding.
- **Stocking Scenarios:** 12-week Lean, Baseline, Resilient, and editable Custom projections with demand, target-DOS, and inbound-realization assumptions.
- **Inventory Health Check:** stockout risk, excess units, obsolete candidates, DOS outliers, healthy counts, exposure quantities, and a prioritized SKU exception table.

The API is implemented in `app/api/[[...path]]/route.js`:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/inventory/policies` | Returns enriched segmentation and optimized inventory policies. |
| `PATCH` | `/api/inventory/policies` | Recalculates suggestions and saves validated planner overrides with an audit entry. |
| `GET` | `/api/inventory/planning` | Returns cadence-based reorder recommendations, scenario projections, and health diagnostics. Accepts `cadence`, `demandAdjustmentPct`, `dosAdjustmentDays`, and `inboundRealizationPct`. |

POC edits persist in server memory and reset when the application process restarts.

---

## 3. Data lineage

### Demand Planning

Tertiary demand is aggregated across channel partners into one observation per SKU-week.

- `average weekly demand = mean(SKU weekly tertiary demand)`
- `weekly standard deviation = population standard deviation(SKU weekly tertiary demand)`
- `CV = weekly standard deviation / average weekly demand`
- `daily standard deviation = weekly standard deviation / √7`

The same demand rate drives safety stock, reorder timing, projected inventory, DOS, and stockout exposure.

### Supply Planning lead times and POs

Supplier-product policy is read through `getOdmEmsMaster()` with this precedence:

1. `supplier_product_mapping.leadTimeDays` for the SKU/vendor line.
2. `supplier_master.defaultLeadTimeDays` when no explicit mapping value exists.
3. A 14-day POC fallback when the SKU has no mapped supplier line.

The selected line also supplies `minimumOrderQuantity` and `orderMultiple`. Open orders come from `getPurchaseOrdersWorkbench()` and contribute:

- outstanding units: `orderedQty - receivedQty`
- promised inbound date: `expectedDeliveryDate`
- supplier and PO status

Open PO quantities are added to inventory position before a new order is suggested. POs due within procurement lead time also reduce projected stockout exposure at receipt.

---

## 4. Planning logic

### Segmentation and safety stock

- **ABC:** cumulative tertiary consumption value — A first 80%, B next 15%, C final 5%.
- **XYZ:** X when CV ≤ 0.25, Y when 0.25 < CV ≤ 0.50, and Z when CV > 0.50.
- Default service targets: A 98%, B 95%, C 90%; planner configurable from 80% to 99.9%.

```text
safety stock = z(service level) × daily demand standard deviation × √lead-time days
reorder point = average daily demand × lead-time days + effective safety stock
maximum inventory = average daily demand × effective DOS + effective safety stock
```

### Reordering recommendations

Review-period days are 7 for weekly, 30 for monthly, and 0 for on-request review.

```text
inventory position = current inventory + all open PO units
target coverage days = max(effective DOS + scenario adjustment, lead time + review period)
order-up-to quantity = adjusted daily demand × target coverage days + effective safety stock
raw recommendation = max(0, order-up-to quantity - inventory position)
recommended quantity = raw recommendation rounded up to MOQ and order multiple
```

The engine calculates the release date by estimating when inventory position reaches the reorder point, offset by PO lead time. Results are classified as `ORDER_NOW`, `PLANNED`, or `COVERED` and include the next open-PO due date.

### Stocking scenarios

Each scenario simulates 12 weekly buckets at SKU level and rolls them up to a portfolio view:

```text
closing inventory = max(0, opening inventory + realized PO/replenishment inbound - adjusted demand)
lost demand = max(0, adjusted demand - available inventory)
```

| Scenario | Demand | Target DOS | Inbound realization |
|---|---:|---:|---:|
| Lean | Base | −7 days | 90% |
| Baseline | Base | No change | 100% |
| Resilient | +10% | +14 days | 100% |
| Custom | Editable −50% to +100% | Editable −30 to +60 days | Editable 0% to 120% |

The comparison shows weekly closing inventory, average inventory, ending inventory, and lost-demand units.

### Inventory Health Check

A SKU can carry multiple health flags:

- `STOCKOUT_RISK`: projected inventory at lead-time receipt is below effective safety stock.
- `EXCESS`: current inventory is more than 25% above calculated maximum inventory.
- `OBSOLETE_CANDIDATE`: a C-class SKU has more than both 90 DOS and twice its effective DOS. This is a velocity/DOS proxy because batch aging and expiry dates are not present in the shared POC dataset.
- `DOS_OUTLIER`: actual DOS is below 50% or above 150% of the effective norm.
- `HEALTHY`: no active flags.

The dashboard quantifies stockout exposure and excess units and prioritizes flagged rows before healthy SKUs.

---

## 5. BOAT requirement mapping

| # | BOAT Inventory Planning Requirement | Status | Resolution / Notes |
|---|---|---|---|
| 1 | **SKU Segmentation based Inventory Planning** | 🟢 Built | ABC consumption-value plus XYZ demand-variability classification and matrix filters. |
| 2 | **System suggested and configurable overall inventory norms** | 🟢 Built | Suggested/effective DOS, service, and safety-stock policies with governed overrides. |
| 3 | **Safety Stock optimization** | 🟢 Built | Uses Demand Planning variability and Supply Planning supplier-product lead time. |
| 4 | **Weekly/Monthly/On-request re-ordering** | 🟢 Built | Cadence-aware, PO-netted recommendations with order date, MOQ, and order-multiple constraints. Recommendation generation does not automatically release a PO. |
| 5 | **Scenario building — projected inventory basis different inventory levels** | 🟢 Built | Four 12-week scenarios compare editable demand, target-DOS, and inbound assumptions. |
| 6 | **Inventory Health Check & Review** | 🟢 Built | KPI dashboard and prioritized detail for stockout, excess, obsolete candidates, DOS outliers, and healthy inventory. |

---

## 6. Key implementation references

- Navigation and UI: `app/page.js` (`NAV_ITEMS`, `InventoryPlanningPage`, `InventoryAdvancedPlanningTabs`)
- Policy, reorder, scenario, and health API: `app/api/[[...path]]/route.js`
- Shared demand history: `lib/dummyData.js`
- Supply lead-time and PO retrieval: `lib/supplyChainService.js` (`getOdmEmsMaster`, `getPurchaseOrdersWorkbench`)
- Supply Planning field definitions: `docs/modules/supply-planning.md`
