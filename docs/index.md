# boAT S&OP Suite — Cross-Module Status Summary

> **Project:** Supply Chain Software (S&OP Suite)  
> **Stack:** Next.js 14 · React · Recharts · Lucide · shadcn/ui  
> **Application surfaces:** S&OP shell in `app/page.js`; Supply Planning Studio in `app/supply-planning/`  
> **Last audited:** 2026-08-11  
> **Audit scope:** Every file in `docs/modules/` was reviewed before this summary was updated.

---

## 1. Final module status

| Module | Route / Nav ID | Status | Current scope and important boundary | Detail |
|---|---|---|---|---|
| Dashboard | `dashboard` | 🟢 Functional, live | Cross-functional review cockpit and owner of the Continuous Demand vs Supply View. | [dashboard.md](./modules/dashboard.md) |
| Demand Planning | `demand` | 🟢 Functional configured POC | Nine workbenches: forecast, AI/ML visibility, NPI/lifecycle, events, channel norms, consensus, integrations, listings, KPIs. | [demand-planning.md](./modules/demand-planning.md) |
| Demand Factors | `factors` | 🟡 Functional prototype | Local PLC/seasonality/promotion/location exploration; still uses three hardcoded demo SKUs and does not own managed events. | [demand-factors.md](./modules/demand-factors.md) |
| Distributor Orders | `orders` | 🟢 Functional | Distributor replenishment order placement, freeze governance, approval path, and dealer activation opportunity. | [distributor-orders.md](./modules/distributor-orders.md) |
| Order vs Dispatch | `dispatch` | 🟡 Functional POC | Downstream ordered-versus-dispatched execution; dispatched units remain simulated pending ASN/shipment integration. | [order-vs-dispatch.md](./modules/order-vs-dispatch.md) |
| Supply Planning | `supply`, `/supply-planning/*` | 🟢 Functional configured POC | Nine operational studio tabs spanning sources, cockpit, MRP, BOM, capacity, procurement, network, constraints, and scenarios. Some action buttons remain stubs. | [supply-planning.md](./modules/supply-planning.md) |
| Inventory Planning | `inventory` | 🟢 Functional configured POC | ABC/XYZ, norms, safety stock, PO-netted reorder recommendations, 12-week scenarios, and health review. | [inventory-planning.md](./modules/inventory-planning.md) |
| Scenario Planning | `scenario` | 🟡 Partial | Live demand/cost/capacity comparison; saved scenarios and persistence remain mocked. | [scenario-planning.md](./modules/scenario-planning.md) |
| Financial Planning | `financial` | 🔵 Functional, out of original scope | Explicitly excluded from this implementation increment and left unchanged. | [financial-planning.md](./modules/financial-planning.md) |
| Chatbot | `chatbot` | 🔵 Functional, out of original scope | Explicitly excluded from this implementation increment and left unchanged. | [chatbot.md](./modules/chatbot.md) |

---

## 2. Continuous Demand vs Supply View — ownership decision

### Existing coverage checked

`Order vs Dispatch` is not the correct owner. It is a distributor execution view that compares customer orders with simulated dispatch and has no time-phased demand plan, supplier PO pipeline, constrained factory capacity, or rolling inventory position.

Dashboard already owned the `Forecast vs Net Supply vs Operating Plan` cross-functional cut. It was therefore extended in place rather than duplicated.

### Live implementation

`GET /api/dashboard/plan-balance` now returns a no-cache, 26-week rolling balance with `isLive=true`, source lineage, timestamps, and a 30-second UI refresh cadence.

| Signal | Current source | Live behavior |
|---|---|---|
| Demand plan | Shared weekly secondary baseline + current Demand Planning consensus workflow + active/planned event uplifts | Demand workflow and event edits are read each recalculation. |
| Constrained production | Supply Planning capacity gap and current operating-plan workload | Production is capped by rated capacity. |
| PO commitments | Supply Planning purchase-order workbench | Outstanding quantity is assigned to the bucket containing `expectedDeliveryDate`; it is not spread evenly across the horizon. |
| Operating plan | Supply Planning planned production + planned purchase | Remains visible beside deliverable net supply. |
| Inventory position | Inventory Planning policies aggregated from the latest channel-stock snapshots | Opening inventory rolls forward as `max(0, opening + net supply − demand)`. |
| Risk | Combined demand, supply, and inventory position | Flags stockout, inventory-risk, deficit, tight, and covered buckets; quantifies unmet demand. |

The Dashboard renders Current Demand Plan, Net Supply, Operating Plan, and Projected Inventory together, plus current/ending inventory, open PO pipeline, capacity-risk weeks, risk detail, horizon tags, source lineage, and calculation timestamp.

### Remaining production hardening

- The POC aligns source calendars by rolling W01–W26 buckets while retaining source week identifiers. Production should use one shared planning calendar/version.
- Data is current to the configured MongoDB collections or local fallback datasets. A production deployment still needs durable integrations and event-driven invalidation.
- Order vs Dispatch remains simulated until ASN/shipment confirmations are connected.

---

## 3. Shared role-based access control

Phase 4b’s permission-lens pattern is now the single shared contract in `lib/roleAccess.js`. No second role taxonomy was introduced.

Canonical roles:

1. Production
2. Sourcing
3. S&OP
4. NPI
5. Category
6. Sales
7. Finance

Both application shells use the same role profile, permission matcher, local-storage key, and cross-window role-change event.

### Enforcement surfaces

| Surface | Enforcement |
|---|---|
| S&OP shell navigation | Unauthorized in-scope tabs are removed; direct active-tab access is denied and returns the user to Dashboard. |
| Dashboard | The same role drives commercial, demand, supply, inventory, cut, scenario, and review-cycle lenses. |
| Demand Planning | Its nine workbenches are permission-filtered; NPI, Sales, Category, Finance, and S&OP receive the sections assigned by the shared role profile. |
| Supply Planning Studio | All nine navigation items use shared permissions; direct URLs and SKU/plant/supplier detail routes render a role-restricted workspace when unauthorized. |
| Review cycle | All seven canonical roles can mark their review; only S&OP can open or close the cycle. |

### Role workspace summary

| Role | Principal in-scope access |
|---|---|
| Production | Dashboard; Order vs Dispatch; Supply Planning; Inventory Planning; Scenario Planning |
| Sourcing | Dashboard; supplier/material/capacity/procurement/network/risk Supply Planning views; Inventory Planning; Scenario Planning |
| S&OP | All in-scope tabs and workbenches |
| NPI | Dashboard; forecast/AI/NPI/events/KPI Demand sections; launch-relevant Supply Planning views; Inventory and Scenario Planning |
| Category | Dashboard; all Demand Planning sections; Demand Factors; Distributor Orders; Order vs Dispatch; Inventory and Scenario Planning |
| Sales | Dashboard; channel-focused Demand Planning sections; Demand Factors; Distributor Orders; Order vs Dispatch; Inventory and Scenario Planning |
| Finance | Dashboard; forecast/AI/consensus/KPI Demand sections; Inventory and Scenario Planning |

Financial Planning and Chatbot remain outside the original BOAT scope and were intentionally not modified or brought under this increment’s permission policy.

> **Security boundary:** This is consistent POC UI/route gating, not identity-provider authentication. Production must derive the role from an authenticated server session and enforce permissions in mutation APIs as well as the UI.

---

## 4. BOAT requirement status

### Demand Planning

| ID | Requirement | Status | Home |
|---|---|---|---|
| DP-1 | Channel Partner Data Integration | 🟢 Configured POC | Demand Planning integration registry |
| DP-2 | AI/ML long/mid/short and channel forecasting | 🟢 Configured POC outputs | Demand Planning AI/ML |
| DP-3 | NPI forecasting | 🟢 Configured POC | Demand Planning NPI & Lifecycle |
| DP-4 | Product Lifecycle Management | 🟢 Configured POC | Demand Planning NPI & Lifecycle |
| DP-5 | Event/Promotion Calendar Engine | 🟢 Configured POC | Demand Planning Event Calendar |
| DP-6 | Suggested channel inventory norms | 🟢 Configured POC | Demand Planning Inventory Norms |
| DP-7 | Category → Sales → S&OP → Finance consensus | 🟢 Configured POC | Demand Planning Consensus |
| DP-8 | Demand Planning KPI dashboard | 🟢 Functional | Demand Planning KPI Dashboard |
| DP-9 | Product/Partner Listing Master | 🟢 Configured POC | Demand Planning Listing Master |

### S&OP Portal

| ID | Requirement | Status | Home |
|---|---|---|---|
| SP-1 | Role-based cross-functional workspace | 🟢 POC implemented | Shared role contract + both shells |
| SP-2 | Configurable review cadence | 🟢 POC implemented | Dashboard review cycle |
| SP-3 | Forecast vs Net Supply vs Operating Plan | 🟢 Live integrated view | Dashboard Continuous Demand vs Supply View |
| SP-4 | What-if scenario comparison | 🟢 Functional comparison / 🟡 persistence | Scenario Planning + Dashboard reuse |
| SP-5 | Review dashboards and category/channel/region cuts | 🟢 Functional | Dashboard |

### Inventory Planning

| ID | Requirement | Status | Home |
|---|---|---|---|
| IP-1 | SKU segmentation | 🟢 Built | Inventory Planning |
| IP-2 | Suggested/configurable overall norms | 🟢 Built | Inventory Planning |
| IP-3 | Safety-stock optimization | 🟢 Built | Inventory Planning |
| IP-4 | Weekly/monthly/on-request reordering | 🟢 Recommendations built | Inventory Planning |
| IP-5 | Projected-inventory scenarios | 🟢 Built | Inventory Planning |
| IP-6 | Inventory Health Check | 🟢 Built | Inventory Planning |

### Supply Planning

| ID | Requirement | Status | Home / qualification |
|---|---|---|---|
| SUP-1 | PO HOD/adherence/exclusions | 🟢 Configured POC | Procurement POs |
| SUP-2 | ODM/EMS master, capacity and lead time | 🟢 Configured POC | Procurement POs + Capacity |
| SUP-3 | Production/Sourcing/S&OP/NPI interface | 🟢 POC implemented | Shared RBAC across Supply Planning routes |
| SUP-4 | RM/FG import planning and tracking | 🟡 Partial | Import fields/services exist; no dedicated full workflow tab |
| SUP-5 | Rough-cut plan from RM and capacity | 🟢 Configured POC | Capacity Planning |
| SUP-6 | Consensus production signoff | 🟢 Functional POC | Capacity Planning state machine |
| SUP-7 | Continuous Demand vs Supply short/medium view | 🟢 Live integrated view | Dashboard, sourced from Demand/Supply/Inventory |
| SUP-8 | KPI tracking and dashboards | 🟢 Functional POC | Overview Cockpit + Dashboard |
| SUP-9 | Medium/long-term capacity planning | 🟢 Configured POC | 52-week Capacity Planning |
| SUP-10 | Supplier lead-time and reliability scorecards | 🟢 Configured POC | Procurement POs |

---

## 5. Cross-module ownership boundaries

- Dashboard owns continuous cross-functional balance and review governance.
- Demand Planning owns demand forecast governance, events, channel feeds, channel norms, lifecycle, and listings.
- Demand Factors remains an isolated exploration tool and does not own managed event records.
- Distributor Orders owns customer/distributor order placement; Procurement POs owns supplier/ODM purchase commitments.
- Order vs Dispatch owns downstream fulfillment execution, not the enterprise demand-supply balance.
- Inventory Planning owns rolled-up SKU norms, replenishment policy, projected inventory scenarios, and health.
- Supply Planning owns factory capacity, material feasibility, supplier commitments, and the operating plan.
- Scenario Planning owns scenario assumption editing; Dashboard only consumes comparison outputs.
- Financial Planning and Chatbot remain out of this increment’s scope.

---

## 6. Technical Reference Documentation

- [DUMMY_DATA_GENERATION.md](./DUMMY_DATA_GENERATION.md) — Comprehensive technical documentation of all synthetic data generation algorithms, seeded PRNG math, noise functions, stock netting formulas, ABC/XYZ segmentation, and client curve shape multipliers.

