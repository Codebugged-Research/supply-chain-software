# Financial Planning Module — Architecture Inventory

> **Module nav id:** `financial`
> **Status:** Functional — fully built, live data, interactive assumption sliders; no write paths, no backend persistence
> **Scope classification:** **Out of original BOAT scope — confirm with stakeholder** (provides value for S&OP Finance role signoff, but was not explicitly listed in BOAT RFP table)
> **Source:** `app/page.js` → `FinancialPage` component (lines ~2378–2952)
> **API endpoints:** `/api/data/weekly`, `/api/data/skus`, `/api/data/weeks` (via `useSopData()`)
> **Last audited:** 2026-08-10

---

## 1. Purpose

Links S&OP demand forecasts with revenue, profitability, and rolling cash collections. Enables Finance to model the P&L impact of demand and cost assumption changes in real-time using interactive sliders, and review budget vs actual vs forecast variances at SKU × week granularity with a 13-week cash inflow projection split by collection segment.

---

## 2. Build Status

**Functional.** All charts and tables are driven by live data with real-time recomputation as sliders change. No write paths — the module is a read-and-compute view. The "Export" button is a UI stub with no onClick handler.

The module is the most analytically rich tab in the S&OP Suite: it has 5 distinct interactive sliders, 7 chart/table widgets, a gross-to-net contribution bridge, and a per-segment cashflow projection. This is genuinely useful for the Finance role in the S&OP Consensus cycle.

---

## 3. Data Entities Read

| Endpoint | Fields used | How |
|---|---|---|
| `/api/data/weekly` → `weekly[]` | `weekId`, `weekLabel`, `skuId`, `skuName`, `distributorId`, `region`, `category`, `tertiary`, `price`, `cost` | Base for all P&L computations — `forecastUnits = tertiary × demandUpliftFactor`, `revenue = forecastUnits × price × priceShiftFactor`, `cost = forecastUnits × cost × costShiftFactor` |
| `/api/data/skus` → `skus[]` | `id`, `name` | SKU name lookup for profitBySku chart |
| `/api/data/weeks` → `weeks[]` | `weekId`, `label` | Revenue trend chart x-axis, cashflow trend (last 13 weeks) |

**Hardcoded data mappings (not from API):**
- `businessCategoryMap` — 5 product categories mapped to business unit groups
- `channelByDistributor` — 5 distributor IDs mapped to channel type (national / distributor / pilot / e-commerce)
- `segmentByDistributor` — 5 distributor IDs mapped to cash collection segment (direct dealer / distributor / modern trade / e-commerce)
- `collectionProfiles` — per-segment AR aging profiles (current / DPD 0–30 / DPD 30–60 / over 60) — hardcoded constants

**Writes:** None.

---

## 4. Key UI Components / Widgets

| Widget | Description |
|---|---|
| Planning Inputs card | 5 sliders: Forecast uplift (−20→+35%), Selling price shift (−15→+20%), Unit cost shift (−10→+25%), Scheme/unit (₹0→₹1000), Logistics/unit (₹0→₹500) — all live-recompute on change |
| 3× `KpiCard` | Revenue (vs baseline Δ%), Profit (vs baseline Δ%), Margin % (+ contribution %) — all driven by `totals` memoized from `financialRows` |
| Revenue Trend `LineChart` | Weekly Revenue + Net Revenue — 26 weeks, shaped by `REVENUE_SHAPE` / `NET_REV_SHAPE` multiplier arrays on live data |
| Profit by SKU `BarChart` (horizontal) | Top 10 SKUs by gross profit — ₹M |
| Category Rollup `DataTable` | 5 categories: Gross Revenue, Net Revenue, Contribution % |
| Channel Rollup `DataTable` | National / Pilot / Distributor / e-commerce: Forecast Units, Revenue, Contribution |
| Contribution Check card | Gross → Scheme → Logistics → Net Revenue → Cost → Contribution bridge |
| 13-Week Cash Inflow `AreaChart` | Due Collections + Overdue Collections stacked — last 13 weeks |
| Channel-wise Cash Flow `DataTable` | 4 segments: Terms, Due, Overdue, Expected Collections — computed from `collectionProfiles` × dispatched revenue |
| Budget vs Actual vs Forecast `DataTable` | Top 12 SKU × week rows by absolute variance — Forecast vs Budget Δ%, Actual vs Forecast Δ%, High/Medium/Low severity flag |

---

## 5. Overlap / Relationship with Other Modules

| Module | Relationship |
|---|---|
| **Dashboard** | Both show Revenue and margin. Dashboard is a summary executive view using `/api/data/kpis`; Financial Planning is a detailed interactive model using `/api/data/weekly` directly. No shared state. |
| **Demand Planning** | `tertiary` (actual sell-out) is the base demand signal for Financial Planning's `forecastUnits`. The Demand Planning slider (±30%) and Financial Planning's `demandUplift` slider serve the same conceptual purpose but are independent local state — changes in one do not propagate to the other. |
| **Scenario Planning** | Scenario Planning (this S&OP Suite tab) has demand uplift, cost shift, and capacity sliders for quarterly revenue/GM projection. Financial Planning has the same demand uplift and cost shift sliders for a weekly P&L model. These are **overlapping in capability** — Scenario Planning is coarser (quarterly, 3 sliders), Financial Planning is finer (weekly, 5 sliders with scheme/logistics breakdown). They should eventually share a scenario state. |
| **Distributor Orders** | Financial Planning's `channelByDistributor` and `segmentByDistributor` maps reference the same 5 distributor IDs used in Distributor Orders. The cashflow projection downstream of the order values placed in Distributor Orders feeds into the "Expected Collections" logic here conceptually, but there is no actual data link. |

---

## 6. BOAT Requirement Mapping & Scope Resolution

| BOAT Requirement | Coverage Status | Mapping / Implementation Notes |
|---|---|---|
| **BOAT RFP Scope Classification** | **Out of Original Scope** | Financial Planning is **not in BOAT's original RFP list**. Retained as a valuable extension for the Finance role in S&OP review, but flagged for stakeholder confirmation. |
| **S&OP Portal #1: Role based Cross functional Workspace** | **Supports Finance View** | Provides the specific financial & P&L review views needed by Finance planners in S&OP. |
| **S&OP Portal #5: Dashboards on various cuts for S&OP review** | **Partially Covered** | Surfaces category rollup, channel rollup, contribution bridge, and 13-week cash inflow projection. |

---

## 7. Finance Role in S&OP Consensus — Design Note

The `DEMAND_PLANNING.md` design contract (Section 2, Req 7) places Finance as Step 4 (final approver) in the 4-step Demand Consensus Workflow: Category Manager → Sales Head → S&OP Lead → **Finance**. This Financial Planning tab provides the Finance team the analytical view they need before approving (P&L impact, budget variance, cashflow implications). However:
- The approval action itself is not in this tab
- The consensus plan data (what is being approved) does not flow into this tab
- There is no role gating — any user can see and manipulate the sliders

Building the Consensus Workflow will need to surface a "Finance Approval" action inside this tab or the Demand Planning tab, backed by the locked consensus numbers.
