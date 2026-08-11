# Module Data-Entity Gap Matrix

Audited on **2026-08-11** against `docs/index.md`, every file in `docs/modules/`, `lib/dummyData.js`, and `app/api/[[...path]]/route.js`. Supply Planning collections referenced by the catch-all route were also checked through their current JSON-backed schemas and service read models.

## Interpretation rules

- **Y** means the entity and the minimum identity/grain needed by the documented feature exist either as a persisted collection/embedded child or as an appropriate current-state derived read model.
- A derived entity counts as **Y** only when the feature needs a current calculation. It does **not** count when the feature requires history, versioning, provenance, or an auditable transaction.
- **N** means the data is absent, has the wrong grain, or is reconstructed after the fact in a way that cannot support the documented feature. The final column assigns the missing entity to an existing architecture layer; it does not propose a new UI owner.
- Fields placed side-by-side on `sop_weekly` are not a forecast vintage. Forecast accuracy by horizon/model requires the forecast as issued, its as-of time/version, and the later actual at the same business key.

## Core planning, governance, and dashboard entities

| Entity | Module(s) needing it | Exists Y/N | If N, existing architecture layer that should own it |
|---|---|---:|---|
| SKU/product master with category, lifecycle, price, cost, planning attributes | Dashboard; Demand Planning; Demand Factors; Distributor Orders; Financial Planning; Supply Planning; Inventory Planning; Scenario Planning; Chatbot | Y | — |
| Component/raw-material identity distinct from finished goods | Supply Planning — Materials & BOM, MRP, imports; Inventory Planning | Y | — |
| Channel/partner/distributor master with type, region, tier and integration attributes | Dashboard; Demand Planning; Distributor Orders; Order vs Dispatch; Financial Planning; Scenario Planning | Y | — |
| Region, warehouse, plant and stocking-location masters | Dashboard; Supply Planning; Inventory Planning; Order vs Dispatch | Y | — |
| Weekly planning calendar | Dashboard; Demand Planning; Supply Planning; Inventory Planning; Financial Planning | Y | — |
| Shared planning-calendar **version** mapping demand, supply, scenario and locked-plan buckets | Dashboard plan balance; Demand Planning; Supply Workspace; Scenario Planning | N | Core S&OP persisted master-data layer beside `sop_weeks`; routes should consume the shared version rather than align arrays by index. |
| SKU × partner × week volume/stock/economics fact containing primary, secondary, tertiary, distributor stock, retail stock, price and cost | Dashboard; Demand Planning; Demand Factors; Distributor Orders; Financial Planning; Inventory Planning; Chatbot | Y | — |
| Current aggregate and KPI read models | Dashboard; Demand Planning KPI Dashboard; Financial Planning; Chatbot | Y | — |
| KPI definition registry with formula, owner, threshold, role visibility and effective dates | Dashboard; Supply Planning Overview; Demand Planning KPI Dashboard; Inventory Planning; Chatbot | N | Cross-module API/configuration persistence layer, adjacent to `planning_rules` and `data_source_logs`. |
| KPI observation/history fact for trend, target and SLA breach analysis | Dashboard; Supply Planning Overview; Demand Planning KPI Dashboard; Inventory Planning | N | Cross-module persisted analytics layer; current `kpis()` and service summaries should write versioned observations rather than only return current values. |
| Dashboard alert/exception record with severity and occurrence time | Dashboard; Chatbot | Y | — |
| Cross-functional review-cycle record with cadence, status, completed roles and history | Dashboard | Y | — |
| Authenticated user, role assignment and effective permission record | Dashboard; Demand Planning consensus; Distributor Orders approvals; Supply Planning; Scenario Planning | N | Existing app-shell/RBAC layer (`lib/roleAccess.js` plus server session); persist assignments and enforce them in mutation routes. |
| Notification/subscription/delivery record for reviews, signoffs, feed failures and SLA breaches | Dashboard; Demand Planning; Supply Planning; Scenario Planning | N | Cross-module workflow/API service layer, consuming existing review, consensus, warning and data-source entities. |
| Export/report job and generated artifact metadata | Dashboard; Supply Planning KPI reporting; Financial Planning | N | Cross-module reporting/API service layer, reading persisted plan/KPI versions. |
| Data-source lineage/health record by collection and last sync | Supply Planning — Input & Data Sources; Dashboard lineage | Y | — |

## Demand Planning and Demand Factors entities

| Entity | Module(s) needing it | Exists Y/N | If N, existing architecture layer that should own it |
|---|---|---:|---|
| Forecast output/vintage at SKU × channel × target week × horizon × model × issued-at/version grain | Demand Planning Forecast Overview and AI/ML; Dashboard; Supply Workspace; Inventory Planning; Scenario Planning; Financial Planning | N | Demand Planning persisted fact layer. Extend beyond `sop_weekly.secondary` and `consensus_forecast` with model, horizon, issue timestamp, target week, source, version and frozen status. |
| Forecast-accuracy observation linking one immutable forecast vintage to the subsequently stored actual | Demand Planning AI/ML and KPI Dashboard; Dashboard review cuts; Chatbot | N | Demand Planning persisted fact layer. Accuracy must be computed from forecast-vintage and actual keys, then stored by model/horizon/as-of period. |
| Locked consensus forecast at SKU × channel × week/version grain | Demand Planning consensus; Dashboard; Supply Workspace; Scenario Planning | Y | — |
| Channel integration configuration including source, cadence and covered domains | Demand Planning Channel Integration; Data Sources | Y | — |
| Feed receipt/run history with start/end, status, row counts, gap periods, source file/checksum and error detail | Demand Planning Channel Integration and KPI Dashboard; Data Sources; Constraints & Risks | N | Existing data-source/integration persistence layer beside `data_source_logs`; `lastSyncAt` alone cannot support freshness history or missing-period proof. |
| Product × partner listing master with effective/delisting dates, status, MOQ, region and exclusivity | Demand Planning Listing Master; Distributor Orders; Scenario Planning | Y | — |
| Channel stock/DOS norm with system suggestion, override, actual, service target and audit fields | Demand Planning Inventory Norms; Inventory Planning; Dashboard; Network & Transfers | Y | — |
| Current product lifecycle-stage record with stage start and horizon-method assignment | Demand Planning NPI & Lifecycle; Demand Factors; Inventory Planning; Scenario Planning | Y | — |
| Lifecycle transition history with old/new stage, effective interval, actor, reason and timestamp | Demand Planning NPI & Lifecycle; Inventory Planning; Scenario Planning | N | Demand Planning workflow persistence layer beside `demand_lifecycle`; PATCH must append transitions rather than overwrite the only stage record. |
| New-product/no-history forecast record with launch week, analog, ramp curve, peak units and cannibalization | Demand Planning NPI Forecasting; Supply Planning capacity/procurement; Scenario Planning | Y | — |
| NPI readiness checklist item/result by gate (BOM, ODM, import, listing), owner, due date and evidence | Demand Planning NPI & Lifecycle/KPI; Supply Planning; Dashboard | N | Demand Planning workflow persistence layer, referencing existing BOM, supplier, import and listing collections. `readinessPct` is an output, not the checklist evidence. |
| Managed demand event/promotion record with week scope, SKU/channel scope, planned and actual uplift | Demand Planning Event Calendar; Dashboard; Supply Workspace; Scenario Planning; Demand Factors | Y | — |
| Reusable event-template/library record with recurring-calendar rules and default scope/uplift | Demand Planning Event Calendar | N | Demand Planning configuration persistence layer beside `demand_events`. |
| Demand-consensus workflow header with status, owner, proposed/final values and lock | Demand Planning Consensus; Dashboard; Supply Workspace; Scenario Planning | Y | — |
| Append-only demand-consensus audit entry containing actor, role, action/field, old value, new value, reason and timestamp | Demand Planning Consensus; Dashboard governance | Y | — |
| Persisted consensus-step assignment/action row per Category, Sales, S&OP and Finance step | Demand Planning Consensus; Financial Planning | N | Demand Planning workflow persistence layer. `CONSENSUS_STEPS` is code configuration and `currentStepOwner` is current state; neither preserves assigned user, per-step outcome/comment/action time. |
| Demand factor configuration for PLC, seasonality, promotion and region multipliers | Demand Factors; Demand Planning | Y | — |
| Competitor/market benchmark fact with brand, category/SKU analogue, period, measure, source and observation date | Demand Factors; Chatbot | N | Existing Demand Planning external/reference-data layer. `/api/demand/market-benchmarks` already names the route, but no populated schema/collection backs it. |
| Published factor-adjusted demand proposal linked to source forecast, enabled factors and author | Demand Factors; Demand Planning Consensus; Scenario Planning | N | Demand Planning forecast/workflow persistence layer; local factor toggles should create a proposal/version rather than mutate the baseline or disappear. |

## Distributor ordering and fulfillment entities

| Entity | Module(s) needing it | Exists Y/N | If N, existing architecture layer that should own it |
|---|---|---:|---|
| Replenishment order suggestion with stock, velocity, recommended quantity, ETA and value | Distributor Orders | Y | — |
| Customer/distributor sales order with embedded SKU lines, status, values and timestamps | Distributor Orders; Order vs Dispatch; Financial Planning | Y | — |
| Order-freeze rule configuration | Distributor Orders | Y | — |
| Append-only order amendment/approval history with actor, role, old/new lines, decision, reason and timestamp | Distributor Orders; Order vs Dispatch | N | Existing `orders` transaction layer; replace the single mutable `pendingApproval` snapshot with an order-workflow/audit child collection. |
| Scheme/promotion commercial master with eligibility, dates, discount/funding, SKU/channel scope and budget | Distributor Orders; Demand Planning Events; Financial Planning; Chatbot scheme ROI | N | Demand Planning/commercial configuration persistence layer; order suggestions should reference a scheme ID rather than embed a derived label only. |
| Distributor credit limit, payment terms, receivable exposure and available credit | Distributor Orders cashflow meter; Financial Planning | N | Financial Planning persisted fact/master layer linked to the channel partner master. Current low/medium/high order-value thresholds are not credit exposure. |
| Dealer/outlet master linked to distributor, geography and active/listed status | Distributor Orders Dealer Activation; Demand Planning channel coverage | N | Channel-partner master/integration persistence layer. Current registered/stocked dealer counts are estimates without dealer identities. |
| Dealer × SKU × period stock and sell-through/activity fact | Distributor Orders Dealer Activation; Demand Planning | N | Channel integration fact layer fed by DMS/POS ingestion. This is required to prove stocked versus active dealers. |
| Dealer-activation opportunity read model | Distributor Orders | Y | — |
| Order-to-dispatch bridge record with order ID, SKU, ordered/dispatched quantity, gap and fill rate | Order vs Dispatch; Distributor Orders | Y | — |
| Actual ASN/shipment confirmation with ASN ID, order line, shipped quantity, warehouse, carrier, dispatch timestamp and source document | Order vs Dispatch; Network & Transfers; Inventory Planning | N | Existing order/dispatch execution persistence layer. `dispatch_records` currently holds a mutable quantity/status but no operational ASN evidence or ingestion path. |
| Dispatch milestone/history event (allocated, packed, dispatched, delivered, cancelled) | Order vs Dispatch; Distributor Orders; Inventory Planning | N | Existing order/dispatch execution persistence layer as an append-only child of dispatch/ASN. |

## Supply Planning, procurement, capacity, and logistics entities

| Entity | Module(s) needing it | Exists Y/N | If N, existing architecture layer that should own it |
|---|---|---:|---|
| BOM/version-effective component relationship with quantity, UOM and scrap | Supply Planning — Materials & BOM, Rough Cut; NPI readiness | Y | — |
| Plant master and SKU/production-line routing with rated daily/weekly capacity | Supply Planning — Capacity and Rough Cut | Y | — |
| ODM/EMS supplier master with vendor type, tier, total/contracted/spot/NPI capacity and default lead time | Supply Planning — ODM/EMS Master, Procurement, Capacity, Constraints; Inventory Planning | Y | — |
| Supplier × SKU/derived-line mapping with line capacity, lead time, MOQ and order multiple | Supply Planning — ODM/EMS Master, Procurement, Rough Cut; Inventory Planning | Y | — |
| Time-phased line-capacity plan with line, week, contracted/spot/reserved/shutdown/expansion quantities and version | Supply Planning — Capacity short/medium/long horizon, Rough Cut, Scenario Studio | N | Supply Planning persisted planning layer beside `plant_product_mapping`; current service capacity rows are plant-level derived views, not a versioned line-week commitment. |
| Production order with planned/produced quantity and dates | Supply Planning — Capacity, Rough Cut, Operating Plan | Y | — |
| Production execution/OEE event with actual output, downtime start/end, reason, rejected units, line and source timestamp | Supply Planning — Rated vs Actual/OEE, Constraints; Supplier scorecards | N | Supply Planning persisted execution fact layer. `producedQty` exists, but downtime and OEE are reconstructed/defaulted by the service. |
| Capacity expansion/CapEx event with line/plant, commissioning week, capacity delta, status and cost | Supply Planning — Medium/Long Capacity; Scenario Studio | N | Supply Planning persisted planning layer. The service already looks for `capacity_expansion_plans`, but no populated entity/schema is present. |
| Time-phased supply/MRP plan at SKU × plant/warehouse × week grain | Dashboard plan balance; Supply Workspace; Capacity; Procurement; Inventory Planning | Y | — |
| Rough-cut constrained production read model combining demand, RM buildability and capacity | Supply Planning — Rough Cut | Y | — |
| Purchase order with supplier, SKU, ordered/received quantity, HOD, promised date, actual date and status | Supply Planning — Procurement/HOD; Inventory Planning; Dashboard | Y | — |
| PO exclusion and append-only revision record with old/new value, actor and timestamp | Supply Planning — PO Adherence | Y | — |
| PO adherence time-series observation by measurement window | Supply Planning — Procurement KPI; Dashboard | Y | — |
| Supplier reliability history/read model for 4/13/52-week OTD, lead-time variance and quality score | Supply Planning — ODM/EMS Scorecard; Procurement; Dashboard; Scenario Planning | Y | — |
| Goods-receipt quality inspection/rejection fact by PO, SKU, supplier, quantity, defect and date | Supply Planning — Supplier Reliability; Constraints | N | Supply Planning procurement/execution persistence layer. A supplier-level `qualityScore` cannot substantiate rejection rate or trend. |
| Import shipment/control-tower record with PO, import type, mode, carrier, BoL, origin, ETA, clearance, costs and in-transit units | Supply Planning — Import Tracking, Procurement, Network; Inventory Planning; Dashboard | Y | — |
| Append-only import/customs milestone history with ETD/ATD/ETA/ATA, port, clearance transitions, evidence and actor/source | Supply Planning — Import Tracking, Constraints; Inventory Planning | N | Supply Planning import persistence layer as a child of `import_shipments`; the current single ETA/status snapshot cannot measure transit or customs adherence. |
| Current inventory position by SKU/location with on-hand, available, reserved, in-transit and update timestamp | Dashboard; Supply Workspace; Materials & BOM; Network & Transfers; Inventory Planning; Constraints | Y | — |
| Inter-DC transfer order with source, destination, quantity, dispatch/expected-arrival dates and status | Supply Planning — Network & Transfers; Inventory Planning | Y | — |
| Transfer shipment/receipt milestone with actual dispatch, actual arrival and received quantity | Supply Planning — Network & Transfers; Inventory Planning | N | Supply Planning network-execution persistence layer as an append-only child of `transfer_orders`. |
| Supply constraint/exception record | Supply Planning — Constraints & Risks; Dashboard; Chatbot | Y | — |
| Root-cause analysis and executive recommendation records | Supply Planning — Constraints & Risks; Dashboard; Chatbot | Y | — |
| Consensus production signoff workflow/status with named actors, timestamps, comments and transition history | Supply Planning — Capacity/Consensus Signoff; Dashboard | Y | — |
| Official consensus plan header **and SKU × week versioned lines** with source scenario, production, purchase, inventory, gaps and locked weeks | Scenario Planning; Supply Planning — Scenario Studio, Workspace, Capacity, Procurement; Dashboard; Inventory Planning | N | Existing Supply Planning plan/workflow persistence layer. `consensus_production_plans` stores workflow status only; `supply_plan` stores lines without a plan/version/scenario/lock identity. |

## Inventory, scenario, financial, and chatbot entities

| Entity | Module(s) needing it | Exists Y/N | If N, existing architecture layer that should own it |
|---|---|---:|---|
| SKU inventory policy with ABC/XYZ, service target, safety stock, DOS, reorder point, lead time and overrides | Inventory Planning; Dashboard; Supply Workspace | Y | — |
| Inventory-policy audit trail with actor, before/after values, reason and timestamp | Inventory Planning | Y | — |
| Reorder recommendation read model with cadence, PO netting, suggested quantity/date and reason | Inventory Planning | Y | — |
| Reorder review/decision/release record linking recommendation version to accept, reject, defer or created PO | Inventory Planning; Procurement POs | N | Inventory Planning workflow persistence layer beside `inventory_policies`; the current recommendation disappears after recalculation and cannot prove planner action. |
| Inventory scenario projection read model with assumptions and 12-week position/lost demand | Inventory Planning | Y | — |
| Persisted inventory-scenario snapshot/version with baseline IDs, assumptions, output and owner | Inventory Planning; Scenario Planning | N | Existing scenario persistence layer (`what_if_scenarios`) extended with inventory-specific versioned inputs/output references. |
| Inventory health assessment read model with stockout, excess, obsolete proxy and DOS flags | Inventory Planning; Dashboard; Chatbot | Y | — |
| Inventory-health observation/history for review closure and recurrence tracking | Inventory Planning; Dashboard | N | Inventory Planning persisted analytics/workflow layer; current flags are recomputed from the latest policy and stock only. |
| Batch aging/expiry/receipt-date fact for genuine obsolete and slow-moving stock analysis | Inventory Planning Health; Financial Planning write-off exposure | N | Inventory/WMS fact layer. `inventory.batchNumber` exists, but no receipt/manufacture/expiry/age dates exist. |
| Scenario definition with named assumptions and summary outcomes | Scenario Planning; Dashboard; Supply Planning Scenario Studio | Y | — |
| Scenario version/audit/publish record with baseline plan version, detailed time-phased output, owner, status and approval history | Scenario Planning; Supply Planning Scenario Studio; Dashboard; Financial Planning | N | Existing scenario persistence layer (`what_if_scenarios`) linked to the official consensus-plan layer. |
| Shared cross-module scenario assumption set used by demand, capacity, inventory and finance calculations | Scenario Planning; Demand Factors; Financial Planning; Inventory Planning; Supply Planning | N | Existing scenario persistence/API layer. Module-local sliders should resolve one scenario/version rather than independent local state. |
| Financial planning configuration for category/channel mapping, collection profiles, scheme and logistics assumptions | Financial Planning | Y | — |
| Derived weekly P&L/contribution read model from volumes, price and cost | Financial Planning; Dashboard | Y | — |
| Budget/target fact at SKU/category/channel × period × version grain | Financial Planning Budget vs Actual vs Forecast; Dashboard | N | Financial Planning persisted fact layer. Budget cannot be inferred from actuals or an arbitrary multiplier after the fact. |
| Accounts-receivable/invoice/collection fact with customer, due date, paid date, open amount and aging bucket | Financial Planning Cash Flow; Distributor Orders credit exposure; Chatbot finance intent | N | Financial Planning transactional/integration layer, sourced from ERP/finance data. Collection-profile percentages are assumptions, not receivables. |
| Chat session with timestamped user/assistant messages | Chatbot | Y | — |
| Current rule-derived insight/card read model | Chatbot; Dashboard alerts | Y | — |
| Persisted answer-grounding trace with message, data snapshot/version, insight IDs, model, usage and error | Chatbot auditability; Dashboard review evidence | N | Existing chat-session persistence layer. The API returns `insightsUsed`, model and usage but does not persist them with the assistant message. |

## Bottom line

The application has broad current-state coverage: masters, weekly operating facts, demand governance records, orders, inventory policies, supplier/PO/import data, constraints, scenarios and chat sessions all exist. The gaps cluster in four places:

1. **Vintage/history facts:** forecast issue-time versus later actual, lifecycle transitions, feed runs, KPI observations, inventory-health observations and transaction milestones.
2. **Execution evidence:** dealer-level feeds, ASN/shipment confirmations, production downtime/quality events, customs milestones and transfer receipts.
3. **Versioned decision objects:** official SKU-week consensus plan lines, scenario versions, inventory recommendation decisions and published factor-adjusted forecasts.
4. **Cross-cutting governance:** persisted user/role assignments, notifications, export artifacts and auditable chatbot grounding.

Those are data-model gaps, not page-plumbing gaps. Adding more derived formulas to `route.js` would not close them; each needs an owned persisted entity at the layer identified above.
