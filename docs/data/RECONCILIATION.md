# DR4 Data-Consumer Reconciliation

This file records cross-consumer checks between the DB-verified DR4 entities in `DATA_MODEL_MASTER.md` and the UI/API consumers documented in `docs/modules/*.md`. A consumer is **verified** only when the running application returns the same canonical value for the same entity. Reading a collection name is insufficient if a live row is missing required canonical fields or the value is merely exposed without affecting the documented calculation.

## 2026-08-13 reconciliation rerun

The optimized application was built and exercised on port 3107. Checks used the running API, not only static source inspection. Result: **5 of 7 canonical domains verified; 2 remain partial**.

| Canonical domain | Same-entity check | Listed consumers checked | Result |
|---|---|---|---|
| NPI/readiness | `NPI-BOAT-NOVA-181`: readiness `75%` in Demand Planning and Supply Planning; Supply Overview portfolio aggregate `68.8%` reconciles to the same readiness items | Demand NPI cards/edit/readiness checklist/KPI; Supply Overview; Supply Workspace reservation input | **Verified** |
| SKU lifecycle master/history | `SKU-BOAT-RZ245`: Demand and Inventory return `DECLINE` / `RAMP_DOWN`; Inventory applies multiplier `0.85` | Demand lifecycle editor/method; Demand Factors PLC; Inventory policy; Scenario EOL handling | **Partial** — live `/api/data/skus` omitted lifecycle fields for Demand Factors, and Scenario returned no EOL exclusions or applied EOL policy |
| Demand events/templates | Live `EVT-DIWALI` is referenced by Demand, Supply grid, constraints, and Scenario, with uplift `32%` | Demand overlay/library; Demand Factors/publish; Supply Workspace/risk; Scenario levers | **Partial** — the live event row lacks `upliftShape`, `stackingGroup`, `maxStackedUpliftPct`, and version, so consumers fall back to FLAT/default cap instead of reading those canonical values |
| Channel inventory norms | `SKU-BOAT-AD141 × DST-001`: target DOS `8` in Demand, Inventory, and Supply | Demand norm editor/KPI; Inventory policy; Supply Overview/constraints/network | **Verified** |
| Forecast vintages/accuracy | `SKU-BOAT-AD141 × DST-001 × 4W`: 52 stored rows, MAPE `3.5748076923%`, bias `-0.6717307692%` | Forecast Intelligence; Forecast Overview; Demand KPI Dashboard | **Verified** |
| Supplier reliability | `MFG-WAVECRAFT-NOIDA × 13W`: score `97`, quality `97.6%`, OTD `100%` in Supplier 360 and reliability scorecard | Supplier 360; Supply constraints; Scenario supplier input | **Verified** |
| PO adherence/HOD | `PUR-2026-01001`: planned `2026-02-23`, actual `2026-02-24`, variance `+1`; portfolio 13W adherence `70%` | Procurement HOD table/status; adherence KPI/trend; Supply Overview; exclusion/revision path | **Verified** |

### Remaining blockers

1. The populated live `sop_skus` read model used by `/api/data/skus` does not expose lifecycle fields even though the lifecycle-specific endpoint and inventory path do. Demand Factors therefore cannot be certified against the same effective lifecycle value.
2. Scenario Planning exposes an `excludedEolSkuIds` field but does not apply lifecycle routing to scenario outputs; the live response contained no EOL IDs.
3. The populated live `demand_events` records are older than the canonical JSON contract and omit shape/stack/cap/version fields. The shared event engine correctly honors those fields when present, but the running consumers cannot be certified while their authoritative rows do not contain them.

The detailed tables below are the pre-fix mismatch baseline. The rerun table above is authoritative for current status; unresolved rows correspond to the blockers just listed.

## Pre-fix mismatch baseline

## NPI pipeline and readiness

| Documented consumer | Current wiring | Mismatch / required source |
|---|---|---|
| Demand Planning — NPI forecast cards, launch curves, and edits (`app/page.js`, `NpiLifecyclePanel`) | Loads `/api/demand/npi-forecasts`; the route reads and patches `demand_npi_forecasts`, then creates a 12-week `projection[]` at request time. The UI also exposes `readinessPct` as a direct editable scalar. | Must read NPI master assumptions from `npi_products`, readiness evidence from `npi_readiness_items`, and stored NPI forecasts from `forecast_vintages`. Readiness must be derived from completed weighted items; the ramp must use the stored DR4 method and extended launch window, not the legacy side table/request-time projection. |
| Demand Planning — NPI readiness checklist and NPI readiness KPI (`NpiLifecyclePanel`, `DemandPlanningKpiDashboard`) | No checklist is loaded. Both KPIs average `readinessPct` from `demand_npi_forecasts`. | Must expose the BOM/ODM/import/listing items from `npi_readiness_items` and calculate the percentage from their weights and evidence references. |
| Supply Planning — Overview Cockpit “NPI Supply Readiness” (`lib/supplyChainService.js#getOverviewMetrics`) | Reads `demand_npi_forecasts` and averages its scalar `readinessPct`. | Must use `npi_products` plus `npi_readiness_items`; the current “DB-backed” UI badge is misleading because it points to the pre-DR4 compatibility collection. |
| Supply Planning — Supply Workspace NPI reservation signal | The workspace does not read `npi_products` or `npi_readiness_items`; NPI capacity is only a static line/master reservation value elsewhere. | The documented NPI flag/readiness input must come from the canonical NPI pipeline and drive the affected SKU/launch-week reservation signal. |

## Product lifecycle per SKU

| Documented consumer | Current wiring | Mismatch / required source |
|---|---|---|
| Demand Planning — lifecycle tags/editor and lifecycle-aware method assignment (`NpiLifecyclePanel`, `ForecastIntelligencePanel`) | `/api/demand/lifecycle` reads and patches `demand_lifecycle`. PATCH overwrites that row, derives methods from a route-local map, uses wall-clock timestamps, and does not append a transition. | Must read/write `sop_skus.lifecycleStage`, `lifecycleStageSinceWeek`, and `forecastMethod`, and append/close records in `lifecycle_transition_history`. Forecast method display and routing must read the effective SKU master field. |
| Demand Factors — PLC badge and multiplier | Reads `/api/data/skus`, but that endpoint returns the imported in-process `SKUS` constant rather than the hydrated `sop_skus` collection. | Must read the DB-backed effective SKU master. Otherwise lifecycle edits in the canonical master cannot reach this screen even when the seeded values happen to match. |
| Inventory Planning — lifecycle-adjusted inventory policy | Inventory policy/reorder APIs use `inventory_policies`, weekly demand, and ODM lead time; they never read the effective lifecycle field. | The documented lifecycle-dependent norm/safety-stock behavior must use `sop_skus.lifecycleStage` (and its effective forecast method where applicable), rather than an isolated policy calculation. |
| Scenario Planning — EOL handling | The scenario UI/API does not read `sop_skus.lifecycleStage`; its baseline and sliders include no EOL exclusion/ramp-down rule. | Long-range scenario rows must use the effective lifecycle master so EOL products are excluded or cleared according to the DR4 method. |

## Event and promotion calendar

| Documented consumer | Current wiring | Mismatch / required source |
|---|---|---|
| Demand Planning — baseline-plus-event overlay (`EventCalendarPanel`) | It does read `demand_events`, but applies every event as a flat `secondary × upliftPercent` adjustment. It ignores `upliftShape`, `stackingGroup`, group caps, category/region scope, and the stored event component in `forecast_vintages`. | The overlay must apply the DR4 shape and stacking rules, or display stored `baselineQty`/`eventUpliftQty` from `forecast_vintages`, while honoring all event scopes. |
| Demand Planning — reusable event library/create flow | No UI/API consumer reads `event_templates`; creation starts from a hardcoded empty draft and hardcoded event-type list. | Populate the library and creation defaults from `event_templates`, retaining the selected `eventTemplateId`. |
| Demand Factors — Promotions toggle and red-dot weeks | Uses `demand_factor_config.promotionWeeks` or the hardcoded `[8, 9, 15, 16, 22, 23]`, with a fixed `1.4` multiplier. It never loads `demand_events`. | `demand_events` must be the only authoritative promotion-week input; use ISO week IDs, event scope, status, uplift, shape, and caps. |
| Supply Planning — Supply Workspace gross-demand event uplift | No `demand_events` read exists in the workspace/service path. | Gross demand for affected SKU/channel/weeks must consume the canonical event-adjusted forecast or the applicable `demand_events`, rather than the legacy `consensus_forecast` alone. |
| Supply Planning — Constraints & Risks high-uplift alert | The constraints/early-warning paths do not read `demand_events`. | Implement the documented event-risk consumer from active canonical events (including the >30% rule) and their scoped weeks. |
| Supply Planning — Scenario Studio event levers | The scenario UI/API does not load canonical events and has no event enable/disable assumption. | Scenario event toggles must reference `demand_events` IDs/versions, not an independent slider or absent input. |

## Channel inventory norms

Resolved **2026-08-13**. `lib/channelInventoryNorms.js` is now the single loader, effective-version selector, override-aware normalizer, and mutation path for `channel_inventory_norms`.

| Consumer | Verified canonical wiring |
|---|---|
| Demand Planning — Channel Inventory Norms editor and KPI | `/api/demand/inventory-norms` reads and patches the canonical collection through the shared loader. |
| Inventory Planning — safety-stock and reorder policies | `/api/inventory/policies` recomputes its SKU policy from canonical per-distributor norm rows and exposes those exact rows as `channelNorms`; the prior persisted-policy read shortcut was removed. |
| Supply Planning — Overview, Constraints, and Network & Transfers | All three service paths use the shared canonical loader; `action=channel_inventory_norms` exposes the same effective rows for verification and module use. |

Runtime comparison for `SKU-BOAT-AD141 × DST-001` returned identical Demand, Inventory, and Supply values: target/effective DOS `8`, band `5–16`, actual DOS `45`, safety stock `220`, CV `0.1947`, version `1`, effective week `2026-W33`.

## ODM/EMS master and reliability history

| Documented consumer | Current wiring | Mismatch / required source |
|---|---|---|
| Supplier 360° detail (`app/supply-planning/supplier/[supplierCode]/page.jsx`) | `getSupplierDetail360()` reads `supplier_master`, `supplier_product_mapping`, and POs only. KPI cards display master scalars with hardcoded fallbacks (`98%`, `95%`, `14 Days`); no manufacturing lines or reliability history are loaded. | The detail destination linked from the ODM/EMS table must read `manufacturing_partners`, `manufacturing_partner_lines`, and `supplier_reliability_history`, including the real 4/13/52-week history. |
| Supply Planning — Constraints & Risks supplier exceptions | The constraints UI/service does not consume `supplier_reliability_history`. | C/D (watch/at-risk) partner exceptions must be raised from the canonical reliability observations. |
| Supply Planning — Scenario Studio supplier-disruption input | The scenario UI/API does not load partner reliability or bind a disruption lever to a partner. | Use `supplier_reliability_history` (and the selected `manufacturing_partners` record) as the documented scenario input. |

## PO handover adherence

| Documented consumer | Current wiring | Mismatch / required source |
|---|---|---|
| Procurement POs — HOD adherence table | `getPoHandoverAdherence()` reads the extended PO/exclusion/revision collections, but still fabricates missing planned handover dates with a fixed offset cycle and uses fixed `2026-08-10` as the open-PO comparison date. | Do not synthesize missing HOD facts. Use only stored `plannedHandoverDate` and `actualHandoverDate`, and an explicit planning-calendar anchor for risk; surface invalid legacy rows as data-quality exceptions. |
| Procurement POs — adherence denominator/status | A PO is counted as closed only when `actualDeliveryDate` exists, even though adherence is evaluated from `actualHandoverDate`; open-row variance is also treated as if it were an actual. | Eligibility and on-time status must follow the stored handover fields and approved exclusion intervals exactly. |
| Procurement POs and Supply Overview — adherence trend/KPI | `getPoAdherenceSummary()` reads legacy `po_adherence_history`; when absent it fabricates four trend points with `-4.2/-1.8/-0.6` offsets. It never reads `po_adherence_observations`. | Read the DB-verified window observations from `po_adherence_observations`; no generated trend offset is permitted. The Supply Overview KPI inherits this mismatch. |
| Procurement POs — exclusion and revision mutations | `setPoExclusionFlag()` replaces one exclusion per PO, deletes it on CLEAR, and writes a reduced revision shape using wall-clock timestamps. | Preserve versioned `po_exclusions` intervals (CLEAR closes the interval) and append full `po_revisions` records with the DR4 chronology and fields. |

## Forecast accuracy history

| Documented consumer | Current wiring | Mismatch / required source |
|---|---|---|
| Demand Planning — AI/ML Forecast Intelligence MAPE, bias, horizon table, and model comparison | The page never calls the existing `/api/demand/forecast-accuracy` or `/api/demand/forecast-vintages` endpoints. It fabricates MLRF/XGBF/NPI/analog/ramp-down series from `sop_weekly` using index multipliers, then computes metrics in the browser. | Read the immutable `forecast_accuracy_history` rows for KPI/backtest values and `forecast_vintages` for model series, keyed by SKU × channel × target week × horizon. The DR0 104-week closed history is required for H39/H52. |
| Demand Planning — Forecast Overview accuracy card and per-SKU accuracy bars | Recomputes MAPE from weekly `secondary` versus `tertiary` and clamps displayed SKU accuracy to 50–99%. | Aggregate the stored forecast/actual pairs in `forecast_accuracy_history`; do not clamp or reconstruct from a mutable weekly series. |
| Demand Planning — closing KPI Dashboard forecast MAPE/bias | Recomputes both metrics from `sop_weekly`; it does not consume `forecast_accuracy_history` despite the canonical API endpoint existing. | Calculate the widget from stored accuracy rows for the selected model/horizon/window (WAPE where specified by the DR4 contract). |
