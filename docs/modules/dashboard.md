# Dashboard Module — Architecture Inventory

> **Module nav id:** `dashboard`
> **Status:** Functional — fully built, live data
> **Source:** `app/page.js` → `DashboardPage` component (lines ~261–484)
> **API endpoints:** `/api/data/*` aggregates, `/api/dashboard/plan-balance`, and `/api/dashboard/review-cycle`
> **Last audited:** 2026-08-11

---

## 1. Purpose

S&OP Executive Dashboard — governed cross-functional review workspace over one shared plan. Sales, Category, Finance, and S&OP use permission-gated lenses; review cadence and completion are tracked; category/channel/region cuts support the meeting; Scenario Planning assumptions are compared without creating a second scenario engine. Existing top-line KPIs, revenue Plan vs Actual, category mix, top-SKU performance, and the 26-bucket **Forecast vs Net Supply vs Operating Plan** view remain available according to role.

---

## 2. Build Status

**Functional configured POC.** Charts and tables are driven by live data from `useSopData()` plus cross-module endpoints. Review-cycle cadence/status/completion writes persist in server memory. Role selection is a POC acting-role lens, not production identity-provider authentication.

### Order vs Dispatch coverage decision

`Order vs Dispatch` does **not** satisfy the complete Forecast vs Net Supply vs Operating Plan cut. It is a per-distributor, non-time-phased execution view comparing ordered quantity with simulated dispatched quantity. It supplies a downstream fulfillment signal, but has no demand forecast, factory capacity constraint, vendor PO receipt pipeline, or operating-plan series. The unified three-way planning cut therefore belongs on Dashboard.

### Scenario Planning reuse decision

Scenario Planning owns authoring and publication. Dashboard does **not** create another editor. It shows canonical named comparisons, identifies the `PUBLISHED` version, and consumes that version's stored output in the plan-balance view. With no published scenario it falls back to current consensus/event-adjusted demand and operational supply.

---

## 3. Data Entities Read

| Entity / Endpoint | Fields used | Where shown |
|---|---|---|
| `/api/data/kpis` → `kpis{}` | `totalRevenue`, `gmPct`, `totalGm`, `totalPrimary`, `totalDemand`, `demandWoW` | 4 KPI cards |
| `/api/data/aggregate?by=weekId` → `byWeek[]` | `key`, `revenue` | AreaChart — revenue shaped by hardcoded `DASH_ACTUAL_SHAPE` / `DASH_PLAN_SHAPE` multipliers |
| `/api/data/aggregate?by=skuId` → `bySku[]` | `key`, `revenue` | Category mix PieChart + Top SKUs table |
| `/api/data/skus` → `skus[]` | `id`, `name`, `category` | SKU name lookup |
| `/api/data/weekly` → `weekly[]` | `skuId`, `weekId`, `revenue` | Growth % (second half vs first half) in Top SKUs |
| `/api/data/meta` → `meta{}` | `skuCount`, `distributorCount`, `weekCount` | Subtitle string |
| `/api/dashboard/plan-balance` | `rows[]`: Phase 3 forecast, capacity-constrained net supply, operating plan, production/purchase split, confirmed PO receipts, rated capacity, utilization, gap and status; `summary{}` and source lineage | Unified 26-bucket S&OP balance chart, exception table and supply KPIs |
| `/api/dashboard/review-cycle` | `cycleId`, cadence, status, start/next/close timestamps, completed roles, history | Weekly/fortnightly/monthly/on-demand cycle configuration, role completion and S&OP open/close governance |
| `/api/scenarios` + active canonical scenario | `activeScenarioVersionId`, assumptions, weekly demand/supply/inventory outcomes | Active comparison marker and selected input for the 26-week balance |

**Writes:** `PATCH /api/dashboard/review-cycle` for cadence changes, role review completion, and S&OP-only open/close actions. POC server-memory persistence.

---

## 4. Key UI Components / Widgets

| Widget | Description |
|---|---|
| 4× `KpiCard` | Total Revenue, Gross Margin %, Primary Sales, Tertiary Demand — live from `/api/data/kpis` |
| Forecast vs Net Supply vs Operating Plan workbench | Three-line 26-bucket view joining Phase 3 demand forecast, net supply and the Supply Planning operating plan |
| Supply-balance KPI strip | Net Supply Coverage %, Cumulative Deficit, Capacity Risk Weeks and Open Vendor PO Pipeline |
| Supply exception `DataTable` | Tight/deficit buckets with forecast, net supply, operating plan, PO receipts, capacity load, gap and status |
| Role workspace selector | Sales / Category / Finance / S&OP lenses gate KPI groups, allowed cuts, commercial values, and detailed supply exceptions |
| Review-cycle control | Configurable WEEKLY / FORTNIGHTLY / MONTHLY / ON_DEMAND cadence, next-review date, cycle state and per-role completion |
| S&OP Review Cuts | Live category/channel/region tables with forecast, actual, bias, attainment and role-permitted revenue |
| What-If Scenario Comparison | Named read-only scenarios calculated by the same demand/cost/capacity model used in Scenario Planning |
| `AreaChart` (Recharts) | Revenue: Plan vs Actual — 26 weeks, per-week multiplier arrays applied to live revenue baseline |
| `PieChart` (Recharts) | Category mix — 5 product categories, revenue share |
| `DataTable` | Top 5 SKUs by revenue — growth %, trend direction, On Track / At Risk / Growth badge |
| Alerts & Exceptions card | 4 **hardcoded static strings** — not driven by any data source |
| Export button | UI stub — no `onClick` handler |

---

## 5. Overlap / Relationship with Other Modules

| Related module | Nature of relationship |
|---|---|
| **Supply Planning → Overview Cockpit** | Both show a KPI strip. Cockpit adds supply-vs-demand balance, predictive early warnings, quick-launch links to planning workbenches. Dashboard is the business P&L executive view; Cockpit is the operational planner view. Complementary, not duplicative. |
| **Demand Planning** | Supplies the Phase 3 secondary/consensus baseline for the unit-based planning cut; revenue and demand KPIs continue to share `/api/data/*` aggregates. |
| **Order vs Dispatch** | Separate downstream execution view: ordered vs simulated dispatched per distributor. It does not duplicate the Dashboard's time-phased forecast/net-supply/operating-plan cut. |
| **Supply Planning → Capacity / Procurement POs** | Supplies rated capacity, planned workload, production/purchase plan and open vendor PO units used to constrain the Dashboard net-supply series. |
| **Financial Planning** | Dashboard Revenue KPI and Financial Planning Revenue total share the same data source. Financial Planning adds budget variance, contribution bridge, 13-week cash flow projection. |
| **Scenario Planning** | Owns scenario assumption editing and publication. Dashboard reads the published selection and outputs without duplicating state. |
| **Chatbot** | The Chatbot's `/api/chat/insights` generates a structured exception list. The Dashboard Alerts panel currently shows 4 hardcoded strings that should be replaced by that feed. |

---

## 6. BOAT Requirement Mapping & Technical Gaps

| BOAT Requirement | Coverage Status | Mapping / Implementation Notes |
|---|---|---|
| **S&OP Portal #5: Dashboards on various cuts needed for S&OP review** | **Implemented POC** | Category, channel and region cuts are live; role lenses govern visibility; configurable cadence tracks the review cycle and cross-functional completion. |
| **S&OP Portal #4: What If Scenario comparison** | **Implemented by reuse** | Dashboard compares named scenarios through the shared Scenario Planning calculation; scenario authoring remains in its existing tab. |
| **S&OP Portal #3: Dashboards - Forecast vs Net Supply vs Operating Plan** | **Implemented POC integration** | Unified rolling view now compares the Phase 3 demand forecast with capacity-constrained production plus PO receipts (Net Supply) and planned production plus planned purchase (Operating Plan). Coverage, deficits, capacity risk and source lineage are visible. |

### Known Technical Gaps

| Gap | Impact |
|---|---|
| Alerts panel is hardcoded | Should consume `/api/chat/insights` (high/medium/low severity) — same feed the Chatbot left column uses |
| Revenue Plan vs Actual chart uses hardcoded shape arrays | This existing commercial chart remains a POC revenue narrative; the new unit-based S&OP balance view uses actual demand/supply planning sources. |
| Export is a non-functional stub | No report-generation hookup |
| Plan-balance time alignment is by rolling S&OP bucket | Phase 3's 26-week demand series and Supply Planning's current rolling horizon use different source calendars, so the POC aligns them by W01–W26 bucket while preserving each source week in the response. Production should use one shared planning calendar/version. |
| Role lens is not production authorization | The POC gates React UI by an acting-role selector. Production must derive roles/permissions from authenticated identity and enforce row/field access server-side. |
| Review cycles are server-memory records | Cadence, completion and history reset on process restart; durable workflow persistence and notifications remain production hardening. |

---

## 7. Inventory Planning Gap Note

There is **no Inventory Planning nav tab** in the current application. `NAV_ITEMS` (line 103–113 of `app/page.js`) lists 9 items: Dashboard, Demand Planning, Demand Factors, Distributor Orders, Order vs Dispatch, Supply Planning, Financial Planning, Scenario Planning, Chatbot. Inventory Planning is absent. This is a documented roadmap gap — no tab exists; do not invent one.
