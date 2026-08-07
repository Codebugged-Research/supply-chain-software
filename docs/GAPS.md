# Supply Planning — Requirement Gap Analysis

> **Source of truth:** `docs/ARCHITECTURE.md` (audited 2026-08-06)
> **Requirements source:** boAT Supply Planning stated requirement list (10 line items)
> **Coverage codes:** ✅ Fully Covered · ⚠️ Partially Covered · ❌ Not Covered
> **Tier classification:** T1 = blocks a core planning workflow · T2 = enhances but does not block

---

## Gap Table

| # | boAT Requirement | Coverage | Existing Tab(s) | What Is Present | What Is Missing | Tier |
|---|-----------------|----------|-----------------|-----------------|-----------------|------|
| 1 | **PO management tool — tracking against Hand Over dates / adherence / exclusions** | ⚠️ Partial | Procurement POs | PO Release Queue table (poNumber, supplierName, skuCode, orderedQty, receivedQty, expectedDeliveryDate, status); Supplier Delivery vs. Production Need Date alignment matrix with dateGapDays; "Batch Approve POs" stub | **Missing:** (a) Handover Date (HOD) as a distinct field separate from expectedDeliveryDate; (b) PO adherence % metric tracking actual vs. committed HOD across a rolling horizon; (c) exclusion / exception flag management (force-close, partial delivery acceptance, hold); (d) PO amendment / revision history log; (e) no write path — approve stub does not persist | **T1** |
| 2 | **ODM & EMS Master management — Production capacity, Line Capacity, Lead Times** | ⚠️ Partial | Capacity Planning | Plant Heatmap covers dailyCapacity, weeklyCapacity, workingShifts, utilizationPercent per plant; Rated vs. Actual OEE table; Capacity Gap 52-week analysis; "Plant 360°" deep-link exists but route is unscaffolded | **Missing:** (a) No ODM/EMS vendor master record (vendor name, type = ODM/EMS, tier classification); (b) Line-level granularity — current data is plant-roll-up only, no individual assembly line rows; (c) Lead time per ODM/EMS/line stored and editable; (d) Contracted vs. rated capacity split; (e) NPI / ramp-up capacity reservation fields; (f) No CRUD — data is read-only, no way to update line parameters | **T1** |
| 3 | **Role Based Interface — Production / Sourcing / S&OP / NPI** | ❌ Not Covered | — | `SupplyChainLayout` renders an identical nav bar for all users; no auth context, no role-aware rendering, no tab/section visibility gating | **Missing entirely:** (a) User authentication & session (role token); (b) Role definitions (Production Planner, Sourcing, S&OP Lead, NPI Manager); (c) Role-gated tab visibility (e.g., NPI only sees NPI pipeline + BOM tabs); (d) Field-level write permissions per role (e.g., only Sourcing can approve POs); (e) Audit trail — who changed what and when | **T1** |
| 4 | **RM & FG Import Planning & Tracking** | ❌ Not Covered | — | Network & Transfers tab covers domestic inter-DC stock movements (warehouseCode, currentStock, daysOfSupply). Procurement POs tab covers purchase orders but has no import-specific fields | **Missing entirely:** (a) Import PO tracking — Bill of Lading, vessel/flight details, port of origin, ETA, customs clearance status; (b) RM (Raw Material) vs. FG (Finished Goods) import type classification; (c) In-transit inventory visibility for imported shipments; (d) Customs hold / demurrage exception tracking; (e) Duty & freight cost per import PO; (f) Import lead-time buffer management vs. standard domestic lead times | **T1** |
| 5 | **Rough Cut Production Planning basis real-time RM availability & Capacity constraints** | ⚠️ Partial | Supply Workspace + Capacity Planning + Materials & BOM | Supply Workspace MRP grid has plannedProduction driven by forecastQty vs. availableInventory; Capacity Planning has rough-cut utilization heatmap; Materials & BOM flags gating RM shortages (isGating) | **Missing:** (a) RM availability is not fed in real-time — grid uses a static availableInventory snapshot, no live ERP / WMS feed; (b) No combined single view that simultaneously shows RM shortfall + capacity headroom and derives a feasible production qty; (c) Planning horizon zones are display-only — the "Recalculate MRP" button is an alert() stub with no engine; (d) No constrained plan output (current plan does not cap production at min(capacity, RM-available)) | **T1** |
| 6 | **Consensus Production Planning Signoff and Alignment** | ⚠️ Partial | Scenario Studio | Side-by-side scenario comparison matrix exists; "Publish Official S&OP Plan" button is present | **Missing:** (a) Button is an alert() stub — no actual write to a published plan record; (b) No structured signoff workflow (draft → review → approved states with named approvers); (c) No role-gated approvals — any user sees the Publish button; (d) No timestamp / owner stamp on the published plan; (e) No email / notification trigger on publish; (f) No lock mechanism preventing edits to a published week's plan | **T1** |
| 7 | **Continuous Demand vs. Supply View — Short / Medium Term** | ⚠️ Partial | Overview Cockpit + Supply Workspace | Overview Cockpit has an AreaChart of weekly demand vs. supply trend; Supply Workspace has a 52-week MRP netting grid per SKU | **Missing:** (a) No aggregated cross-SKU demand vs. supply view (current chart is aggregate from API, not drillable by product family or channel); (b) Short-term horizon (0–4 weeks) not distinguished from medium-term (5–26 weeks) with different data refresh cadences; (c) No "frozen zone" edit-lock on the chart — locked weeks and open weeks look identical visually; (d) No demand signal source toggle (statistical forecast vs. customer order vs. consensus); (e) No channel/region split in the demand vs. supply view | **T2** |
| 8 | **KPI tracking & Dashboards** | ⚠️ Partial | Overview Cockpit + all tabs (KpiCard) | Overview Cockpit has 4 KpiCards (Order Fulfillment Rate, Stock Shortage, Factory Bottlenecks, Warehouse Stock); individual tabs have contextual KpiCards; early warning banner shows top-1 risk | **Missing:** (a) No unified KPI registry — each KpiCard is hard-coded per page with a static fallback value; (b) No KPI trend history chart (only single current value shown, no sparkline or week-over-week); (c) No configurable KPI thresholds / alert rules per user/role; (d) No exportable KPI report (PDF/Excel); (e) No SLA breach notification; (f) Metrics for PO adherence, ODM on-time delivery, import in-transit count, NPI readiness are entirely absent from the cockpit | **T2** |
| 9 | **Medium & Long Term Capacity Planning** | ⚠️ Partial | Capacity Planning | 52-week capacity gap heatmap exists (capacityGap[] with week, ratedWeeklyCapacity, plannedWorkload, capacityGapUnits, utilizationPct); recommendations panel present | **Missing:** (a) Medium term = 13–26 weeks; Long term = 27–52+ weeks — current UI renders both in the same table with no horizon segmentation or different planning logic applied; (b) No capacity investment / CapEx planning view (planned line additions, new plant commissioning dates); (c) No seasonal capacity reservation (festival surge blocks, shutdown periods); (d) No contracted capacity vs. spot capacity split across ODM/EMS; (e) No what-if on capacity expansion (Scenario Studio does not link to capacity levers) | **T2** |
| 10 | **Supplier / ODM lead-time & reliability scorecards** | ❌ Not Covered | — | Procurement POs has a "Supplier 360°" deep-link per row but the `/supply-planning/supplier/:supplierCode` route is unscaffolded. needDates[] shows delivery vs. need date gap per PO but this is not aggregated into a scorecard | **Missing entirely:** (a) Supplier master record (name, type = ODM/EMS/RM vendor, tier, category, country); (b) Aggregated on-time delivery % per supplier over rolling 4/13/52-week windows; (c) Lead-time actuals vs. quoted comparison per supplier; (d) Quality / rejection rate metric; (e) Reliability score composite (OTD + lead-time variance + quality); (f) Scorecard UI — ranked supplier table with trend sparklines; (g) Comparison across suppliers for the same component | **T1** |

---

## Coverage Summary

| Coverage | Count | Requirement #s |
|----------|-------|----------------|
| ✅ Fully Covered | 0 | — |
| ⚠️ Partially Covered | 7 | 1, 2, 5, 6, 7, 8, 9 |
| ❌ Not Covered | 3 | 3, 4, 10 |

**Tier 1 gaps (blocks core workflows): Req 1, 2, 3, 4, 5, 6, 10**
**Tier 2 gaps (enhancements): Req 7, 8, 9**

---

## Proposed Information Architecture

The analysis below maps each gap to either a **new top-level tab** or a **new section inside an existing tab**, based on two criteria: (a) does it have a distinct primary user / workflow, and (b) is the surface area large enough to warrant its own navigation entry?

### New Top-Level Tabs (net-new routes)

These gaps have a distinct primary user, a distinct data domain, and enough surface area that embedding them inside an existing tab would force an existing tab to do two conceptually separate jobs.

| Proposed Tab | Addresses Req # | Rationale |
|---|---|---|
| **ODM & EMS Master** (`/supply-planning/odm-ems`) | 2, 10 | ODM/EMS vendor master, per-line capacity, contracted lead times, and reliability scorecards are all vendor-master data that has a single primary owner (Sourcing). Merging into Capacity Planning would conflate factory-side (plant ops) with vendor-side (sourcing) concerns. This tab becomes the "Supplier 360°" destination that is already linked from Procurement POs. |
| **Import Tracking** (`/supply-planning/import`) | 4 | Import PO tracking (BoL, vessel, ETA, customs status, in-transit inventory) is operationally distinct from domestic PO release management. The data entities, the responsible team (Import/Logistics), and the planning cadence (shipment-window based, not weekly MRP) all differ from the Procurement POs tab. |
| **Access & Roles** (`/supply-planning/admin/roles` — or handled at app-shell level) | 3 | Role-based access is a cross-cutting concern that affects every tab, not a planning workflow in itself. It should live at the app-shell / middleware level (Next.js middleware + session context), but a lightweight Admin panel tab is needed for role assignment and audit trail visibility. |

### New Sections Inside Existing Tabs

These gaps are substantively covered by an existing tab but require discrete sub-sections added to it. Adding a new top-level tab would fragment the user's workflow.

| Existing Tab | New Section(s) to Add | Addresses Req # |
|---|---|---|
| **Procurement POs** | (a) "Handover Date Adherence" sub-tab — HOD tracking, adherence % trend, exclusion flag management, PO revision log; (b) Actual write path for batch approve (replace alert stubs with API mutations) | 1 |
| **Capacity Planning** | (a) "Line-Level Detail" sub-tab — assembly line rows per plant, NPI ramp slots, contracted vs. spot capacity; (b) Horizon segmentation legend (Medium: W13–W26, Long: W27–W52+); (c) CapEx / expansion roadmap section | 2, 9 |
| **Scenario Studio** | (a) Structured signoff workflow panel — draft / review / approved state machine with named approver field and timestamp; (b) Lock mechanism for published plan weeks; (c) Capacity lever what-if inputs (link to Capacity Planning data) | 6, 9 |
| **Overview Cockpit** | (a) KPI registry section with configurable thresholds; (b) Sparkline trend per KPI card; (c) Add missing KPIs: PO Adherence %, Supplier OTD %, Import In-Transit Count, NPI Readiness %; (d) Horizon-segmented demand vs. supply chart (short / medium toggles) with demand signal source selector | 7, 8 |
| **Supply Workspace** | (a) Constrained plan column — derived as min(capacity headroom, RM-available, gross demand) in each week cell; (b) Real-time RM availability indicator per week row (green/amber/red badge driven by live stock feed) | 5 |

### Revised Navigation Order (after additions)

```
Input & Data Sources
Overview Cockpit           ← add KPI registry, demand signal toggle
Supply Workspace           ← add constrained plan column + RM availability badge
Materials & BOM
Capacity Planning          ← add line-level sub-tab, horizon segmentation, CapEx roadmap
ODM & EMS Master           [NEW TAB]
Procurement POs            ← add HOD Adherence sub-tab + write path
Import Tracking            [NEW TAB]
Network & Transfers
Constraints & Risks
Scenario Studio            ← add signoff workflow, capacity levers
Access & Roles             [NEW — app-shell level or lightweight admin tab]
```

> **Implementation sequencing recommendation (T1 first):**
> Sprint 1 — Role-based access (Req 3, T1 — gates all other role-specific features)
> Sprint 2 — Handover date adherence + PO write path (Req 1, T1)
> Sprint 3 — ODM & EMS Master tab + Supplier scorecard (Req 2, 10, T1)
> Sprint 4 — Import Tracking tab (Req 4, T1)
> Sprint 5 — Constrained production plan engine in Supply Workspace (Req 5, T1)
> Sprint 6 — Consensus signoff workflow in Scenario Studio (Req 6, T1)
> Sprint 7 — KPI registry + demand view enhancements (Req 7, 8, T2)
> Sprint 8 — Long-term capacity planning sections (Req 9, T2)
