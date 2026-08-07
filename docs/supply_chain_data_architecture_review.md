# Supply Planning System: Database Architecture Review

**Role:** Principal Supply Chain Data Architect  
**Scope:** Review of 18 finalized business collections across 8 functional domains for completeness, relational integrity, indexing efficiency, and horizontal scalability.  
**Constraint Adherence:** Zero schema redesign, zero collection additions or deletions.

---

## Architectural Overview & Integrity Assessment

The schema presents a robust, highly modular design appropriate for enterprise Supply Planning (MRP II / Advanced Planning & Scheduling). 

1. **Domain Isolation:** The 1:1 decomposition of `product_master` into planning, pricing, and logistics segments prevents document bloat and lock contention during concurrent MRP runs, pricing batch updates, and WMS syncs.
2. **N:M Sourcing Matrices:** `supplier_product_mapping` and `plant_product_mapping` decouple location capabilities from core product definition, enabling complex multi-sourcing and line-level constraint resolution.
3. **Time-Phased Planning Horizon:** `consensus_forecast` and `supply_plan` leverage weekly time buckets, providing predictable dynamic querying patterns for MRP explosion engine calculations.

---

## Collection Specifications & Indexing Strategy

---

### DOMAIN 1 — Product

#### 1. `product_master`
* **Purpose:** Core master data repository for physical and logical product definitions, classification, hierarchy, and lifecycle tracking.
* **Parent Collections:** None *(Root entity)*
* **Child Collections:** `product_planning`, `product_pricing`, `product_logistics`, `supplier_product_mapping`, `plant_product_mapping`, `inventory`, `bom_master` (as parent & component), `production_orders`, `purchase_orders`, `consensus_forecast`, `supply_plan`, `supply_constraints`.
* **Relationships:**
  * `1 : 1` with `product_planning`, `product_pricing`, `product_logistics` (Key: `skuCode`)
  * `1 : N` with `supplier_product_mapping`, `plant_product_mapping`, `inventory`, `production_orders`, `purchase_orders`, `consensus_forecast`, `supply_plan`, `supply_constraints`
  * `1 : N` (Self-referential parent/component) with `bom_master`
* **Recommended Indexes:**
  * `{ skuCode: 1 }` — **Unique** *(Primary key for domain lookups)*
  * `{ category: 1, subCategory: 1, status: 1 }` — **Compound** *(For inventory & planning aggregations)*
  * `{ brand: 1, status: 1 }` — **Compound** *(Brand portfolio filtering)*
  * `{ barcode: 1 }` — **Sparse / Unique** *(POS & scanner integrations)*
* **Estimated Document Count:** `10,000 – 100,000` documents *(Mid to Large Enterprise SKU portfolio)*

---

#### 2. `product_planning`
* **Purpose:** Stores SKU-level planning policy controls (ABC/XYZ matrix, safety stock, lead time fences, planning calendars, service levels) driving the MRP engine.
* **Parent Collections:** `product_master`
* **Child Collections:** `supply_plan`, `production_orders`, `purchase_orders` *(Consumed during MRP allocation runs)*
* **Relationships:**
  * `1 : 1` with `product_master` (Key: `skuCode`)
* **Recommended Indexes:**
  * `{ skuCode: 1 }` — **Unique** *(Direct join resolution)*
  * `{ abcClass: 1, xyzClass: 1 }` — **Compound** *(ABC-XYZ inventory policy segment runs)*
  * `{ plannerGroup: 1, plannerName: 1 }` — **Compound** *(Planner dashboard filtering)*
* **Estimated Document Count:** `10,000 – 100,000` documents *(1:1 parity with active SKUs)*

---

#### 3. `product_pricing`
* **Purpose:** Stores cost baselines (standard, manufacturing, landed, transfer price) and valuation metrics required for costed MRP and financial margin analysis.
* **Parent Collections:** `product_master`
* **Child Collections:** `supply_plan` *(Costed inventory projections)*, `purchase_orders` *(Target PO valuation)*
* **Relationships:**
  * `1 : 1` (or `1 : N` if historical date validity is enforced) with `product_master` (Key: `skuCode`)
* **Recommended Indexes:**
  * `{ skuCode: 1, effectiveFrom: -1 }` — **Compound / Unique** *(Fast active price lookup)*
* **Estimated Document Count:** `10,000 – 100,000` documents *(Current price master)*

---

#### 4. `product_logistics`
* **Purpose:** Physical weight, cube, packaging (carton/pallet), and material handling constraints for storage and transportation capacity planning.
* **Parent Collections:** `product_master`
* **Child Collections:** `warehouse_master` *(Cubage capacity validation)*, `supply_constraints` *(Container/truck utilization alerts)*
* **Relationships:**
  * `1 : 1` with `product_master` (Key: `skuCode`)
* **Recommended Indexes:**
  * `{ skuCode: 1 }` — **Unique** *(Direct join key)*
  * `{ hazardousMaterial: 1, storageCondition: 1 }` — **Compound** *(Warehouse allocation routing)*
* **Estimated Document Count:** `10,000 – 100,000` documents *(1:1 parity with active SKUs)*

---

### DOMAIN 2 — Supply Network

#### 5. `plant_master`
* **Purpose:** Manufacturing facility master defining operational hours, shifts, timezone, and aggregate plant output capacity.
* **Parent Collections:** None *(Root entity)*
* **Child Collections:** `plant_product_mapping`, `inventory`, `production_orders`, `supply_plan`
* **Relationships:**
  * `1 : N` with `plant_product_mapping`, `inventory`, `production_orders`, `supply_plan` (Key: `plantCode`)
* **Recommended Indexes:**
  * `{ plantCode: 1 }` — **Unique** *(Primary key)*
  * `{ status: 1, country: 1 }` — **Compound** *(Active network node filtering)*
* **Estimated Document Count:** `5 – 50` documents *(Manufacturing footprint)*

---

#### 6. `warehouse_master`
* **Purpose:** Storage facility and distribution center master establishing node type, physical holding capacity, and holding cost rates.
* **Parent Collections:** None *(Root entity)*
* **Child Collections:** `inventory`, `supply_plan`
* **Relationships:**
  * `1 : N` with `inventory`, `supply_plan` (Key: `warehouseCode`)
* **Recommended Indexes:**
  * `{ warehouseCode: 1 }` — **Unique** *(Primary key)*
  * `{ warehouseType: 1, status: 1 }` — **Compound** *(DC routing)*
* **Estimated Document Count:** `20 – 500` documents *(Regional DCs, Hubs, 3PLs)*

---

#### 7. `supplier_master`
* **Purpose:** Vendor master maintaining supplier profiles, default lead times, operational ratings, and On-Time Delivery (OTD) scores.
* **Parent Collections:** None *(Root entity)*
* **Child Collections:** `supplier_product_mapping`, `purchase_orders`
* **Relationships:**
  * `1 : N` with `supplier_product_mapping`, `purchase_orders` (Key: `supplierCode`)
* **Recommended Indexes:**
  * `{ supplierCode: 1 }` — **Unique** *(Primary key)*
  * `{ status: 1, rating: -1 }` — **Compound** *(Vendor performance analysis)*
* **Estimated Document Count:** `500 – 5,000` documents *(Approved vendor base)*

---

#### 8. `customer_channel_master`
* **Purpose:** Sales and distribution channel master defining order fulfillment priorities, target buffer policies, and service level targets across channels.
* **Parent Collections:** None *(Root entity)*
* **Child Collections:** `consensus_forecast` *(Channel-level forecast breakdown)*
* **Relationships:**
  * `1 : N` with downstream channel allocation and consensus forecast datasets (Key: `channelCode`)
* **Recommended Indexes:**
  * `{ channelCode: 1 }` — **Unique** *(Primary key)*
  * `{ priority: 1, status: 1 }` — **Compound** *(Demand prioritization engine)*
* **Estimated Document Count:** `10 – 100` documents *(Key commercial channels)*

---

### DOMAIN 3 — Mapping Collections

#### 9. `supplier_product_mapping`
* **Purpose:** Sourcing matrix defining procurement parameters (vendor SKU, specific lead times, MOQs, order multiples, purchase price, and capacities).
* **Parent Collections:** `supplier_master`, `product_master`
* **Child Collections:** `purchase_orders` *(Resolution of MOQ & price during planned order generation)*
* **Relationships:**
  * `N : M` junction between `supplier_master` and `product_master` (Keys: `supplierCode`, `skuCode`)
* **Recommended Indexes:**
  * `{ supplierCode: 1, skuCode: 1 }` — **Unique Compound** *(Primary lookup key)*
  * `{ skuCode: 1, preferredSupplier: -1, status: 1 }` — **Compound** *(Fast MRP sourcing engine decision)*
* **Estimated Document Count:** `20,000 – 300,000` documents *(Multi-sourcing matrix across SKUs)*

---

#### 10. `plant_product_mapping`
* **Purpose:** Manufacturing capability matrix mapping SKUs to qualified production lines, daily/weekly capacities, and throughput rates per facility.
* **Parent Collections:** `plant_master`, `product_master`
* **Child Collections:** `production_orders`, `supply_plan` *(Capacity feasibility validation)*
* **Relationships:**
  * `N : M` junction between `plant_master` and `product_master` (Keys: `plantCode`, `skuCode`)
* **Recommended Indexes:**
  * `{ plantCode: 1, skuCode: 1, productionLine: 1 }` — **Unique Compound** *(Line qualification primary key)*
  * `{ skuCode: 1, status: 1 }` — **Compound** *(MRP plant sourcing engine resolution)*
* **Estimated Document Count:** `15,000 – 150,000` documents *(Line-level SKU assignments)*

---

### DOMAIN 4 — Inventory

#### 11. `inventory`
* **Purpose:** On-hand, in-transit, and batch-level stock state record across network nodes (plants/warehouses).
* **Parent Collections:** `product_master`, `warehouse_master`, `plant_master`
* **Child Collections:** `supply_plan` *(Starting inventory balance for MRP netting)*, `supply_constraints` *(Stockout alerts)*
* **Relationships:**
  * `N : 1` with `product_master` (Key: `skuCode`)
  * `N : 1` with `warehouse_master` (Key: `warehouseCode`)
  * `N : 1` with `plant_master` (Key: `plantCode`)
* **Recommended Indexes:**
  * `{ skuCode: 1, warehouseCode: 1, plantCode: 1, batchNumber: 1 }` — **Unique Compound** *(Stock identity lookup)*
  * `{ warehouseCode: 1, skuCode: 1, availableQty: 1 }` — **Compound** *(DC inventory availability queries)*
  * `{ plantCode: 1, skuCode: 1 }` — **Compound** *(Plant stock availability queries)*
  * `{ lastUpdated: -1 }` — **Single Key** *(CDC & audit syncs)*
* **Estimated Document Count:** `100,000 – 2,000,000` documents *(Scales with SKU x Node x Batch granularity)*

---

### DOMAIN 5 — Manufacturing

#### 12. `bom_master`
* **Purpose:** Multi-level Bill of Materials specifying component consumption, scrap factors, and effectivity dates for MRP component explosion.
* **Parent Collections:** `product_master` (referencing `parentSku` and `componentSku`)
* **Child Collections:** `production_orders` *(BOM explosion for shop-floor picking)*, `supply_plan` *(Gross component demand calculation)*
* **Relationships:**
  * `N : M` self-referential structure on `product_master` (Keys: `parentSku` -> `componentSku`)
* **Recommended Indexes:**
  * `{ parentSku: 1, componentSku: 1, effectiveFrom: 1 }` — **Unique Compound** *(Top-down MRP explosion index)*
  * `{ componentSku: 1, parentSku: 1 }` — **Compound** *(Where-used component analysis)*
* **Estimated Document Count:** `50,000 – 500,000` documents *(Assembly & sub-assembly component linkages)*

---

#### 13. `production_orders`
* **Purpose:** Factory production schedule tracking planned, released, in-progress, and completed work orders by SKU and plant.
* **Parent Collections:** `product_master`, `plant_master`
* **Child Collections:** `inventory` *(Stock receipt upon completion)*, `supply_plan` *(Scheduled receipts in MRP engine)*
* **Relationships:**
  * `N : 1` with `product_master` (Key: `skuCode`)
  * `N : 1` with `plant_master` (Key: `plantCode`)
* **Recommended Indexes:**
  * `{ productionOrderNo: 1 }` — **Unique** *(Primary order identifier)*
  * `{ plantCode: 1, skuCode: 1, status: 1, startDate: 1 }` — **Compound** *(Plant schedule aggregation)*
  * `{ skuCode: 1, status: 1, endDate: 1 }` — **Compound** *(MRP scheduled receipt netting)*
* **Estimated Document Count:** `50,000 – 500,000` documents/year *(Historical & active work orders)*

---

### DOMAIN 6 — Procurement

#### 14. `purchase_orders`
* **Purpose:** Tracks external supplier orders, open quantities, promised delivery dates, and receiving status for inbound material supply.
* **Parent Collections:** `supplier_master`, `product_master`
* **Child Collections:** `inventory` *(Goods receipt sync)*, `supply_plan` *(Inbound purchase pipeline / scheduled receipts)*
* **Relationships:**
  * `N : 1` with `supplier_master` (Key: `supplierCode`)
  * `N : 1` with `product_master` (Key: `skuCode`)
* **Recommended Indexes:**
  * `{ poNumber: 1, skuCode: 1 }` — **Unique Compound** *(PO Line resolution)*
  * `{ supplierCode: 1, status: 1, expectedDeliveryDate: 1 }` — **Compound** *(Vendor expediting)*
  * `{ skuCode: 1, status: 1, expectedDeliveryDate: 1 }` — **Compound** *(MRP inbound pipeline netting)*
* **Estimated Document Count:** `100,000 – 1,000,000` documents/year *(PO Line granularity)*

---

### DOMAIN 7 — Demand Planning (Read-Only Input)

#### 15. `consensus_forecast`
* **Purpose:** Unconstrained baseline consensus demand input by SKU, location, week, and version for gross demand netting in MRP runs.
* **Parent Collections:** `product_master` *(Location references `warehouse_master` / `customer_channel_master`)*
* **Child Collections:** `supply_plan` *(Primary driver for MRP calculation)*
* **Relationships:**
  * `N : 1` with `product_master` (Key: `skuCode`)
* **Recommended Indexes:**
  * `{ skuCode: 1, location: 1, week: 1, forecastVersion: 1 }` — **Unique Compound** *(Fast engine fetch per planning cycle)*
  * `{ week: 1, skuCode: 1 }` — **Compound** *(Horizon time-bucket queries)*
* **Estimated Document Count:** `500,000 – 5,000,000` documents *(10k SKUs x 50 locations x 52 horizon weeks x versions)*

---

### DOMAIN 8 — Supply Planning Outputs

#### 16. `supply_plan`
* **Purpose:** Engine output collection containing time-phased balance sheets (projected inventory, planned production, planned purchase, supply gaps) per SKU/location/week.
* **Parent Collections:** `product_master`, `plant_master`, `warehouse_master`, `what_if_scenarios`
* **Child Collections:** Execution triggers driving `production_orders` and `purchase_orders`
* **Relationships:**
  * `N : 1` with `product_master` (Key: `skuCode`)
  * `N : 1` with `plant_master` (Key: `plantCode`)
  * `N : 1` with `warehouse_master` (Key: `warehouseCode`)
* **Recommended Indexes:**
  * `{ skuCode: 1, week: 1, plantCode: 1, warehouseCode: 1 }` — **Unique Compound** *(Primary plan query key)*
  * `{ plantCode: 1, week: 1, plannedProduction: 1 }` — **Compound** *(Plant master schedule rollup)*
  * `{ warehouseCode: 1, week: 1, plannedPurchase: 1 }` — **Compound** *(Purchasing plan rollup)*
  * `{ supplyGap: -1, planningStatus: 1 }` — **Compound** *(Instant shortage exception filtering)*
* **Estimated Document Count:** `1,000,000 – 10,000,000` documents per active scenario run

---

#### 17. `supply_constraints`
* **Purpose:** Diagnostic exception log generated during MRP execution capturing capacity bottlenecks, supplier delays, material shortages, and storage overfills.
* **Parent Collections:** `product_master`, `supply_plan`
* **Child Collections:** Planner action workflow dashboards
* **Relationships:**
  * `N : 1` with `product_master` (Key: `skuCode`) and `supply_plan`
* **Recommended Indexes:**
  * `{ severity: 1, resolved: 1, createdAt: -1 }` — **Compound** *(Planner priority queue)*
  * `{ skuCode: 1, resolved: 1 }` — **Compound** *(SKU exception lookup)*
  * `{ constraintType: 1, constraintSource: 1, resolved: 1 }` — **Compound** *(Root cause bottleneck analytics)*
* **Estimated Document Count:** `50,000 – 500,000` documents per plan run

---

#### 18. `what_if_scenarios`
* **Purpose:** Scenario management container defining simulation parameters, baseline assumptions, and pointer to the corresponding generated `supply_plan`.
* **Parent Collections:** None
* **Child Collections:** `supply_plan` (Key: `generatedSupplyPlanId`)
* **Relationships:**
  * `1 : 1` or `1 : N` with `supply_plan` (Key: `generatedSupplyPlanId`)
* **Recommended Indexes:**
  * `{ generatedSupplyPlanId: 1 }` — **Unique/Sparse** *(Scenario plan linkage)*
  * `{ createdBy: 1, createdAt: -1 }` — **Compound** *(User scenario history)*
  * `{ scenarioName: 1 }` — **Single Key** *(Scenario lookup)*
* **Estimated Document Count:** `100 – 5,000` documents *(Active scenario simulations)*

---

## Architectural & Scalability Recommendations (Non-Redesign)

Without altering collections or schema boundaries, the following non-invasive database optimizations are recommended to ensure enterprise-grade scaling:

1. **Shard Key Strategy for High-Volume Collections:**
   * For `supply_plan` and `consensus_forecast`, use a ranged compound shard key: `{ skuCode: "hashed", week: 1 }`. This guarantees balanced distribution across MongoDB shards while ensuring that weekly range queries for a given SKU hit a single shard.

2. **Index Alignment for MRP Netting Loop:**
   * The core MRP netting loop repeatedly iterates over `(skuCode, week)`. Placing `skuCode` as the leading field in compound indexes across `consensus_forecast`, `inventory`, `bom_master`, and `supply_plan` keeps RAM page faults near 0% during engine execution.

3. **Data Retention & Archival (TTL / Snapshotting):**
   * Collections such as `supply_constraints` and unapproved baseline runs in `supply_plan` can grow rapidly. It is recommended to configure TTL (Time-To-Live) indexes or automated snapshot archiving on historical `what_if_scenarios` and temporary planning runs to preserve working memory.

---
*Report compiled for Supply Planning System Architecture Review.*
