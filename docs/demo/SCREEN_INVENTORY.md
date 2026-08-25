# S&OP Suite — Screen Inventory (Demo Script Input)

> Walkthrough order matches a natural demo flow, not nav/menu order where they differ. "(not yet functional)" flags items from the docs/index.md deferred-stub list. Financial Planning and Chatbot are out of scope per instruction.

---

### Dashboard

- **What's on screen**: Title, live-data subtitle, "Live refresh"/"Export" buttons. Role banner with review-cadence controls. Up to 4 revenue/GM/sales KPI cards. Large "Continuous Demand vs Supply View" card: LIVE badge, stat tiles, 4-line chart (Demand Plan/Net Supply/Operating Plan/Projected Inventory), at-risk-weeks table, source footnote. Below: Review Cuts table + What-If Scenario bar chart side by side; Revenue Plan-vs-Actual area chart + Category Mix pie side by side; Top SKUs table + Alerts list side by side.
- **What it's showing**: One shared cross-functional plan — is demand, constrained supply, and inventory in balance over the next 26 weeks, and where are the exceptions.
- **Key interactions**: Live refresh, cadence dropdown, "Mark reviewed", S&OP-only "Close/Open cycle", review-cut dropdown — all functional. "Export" (not yet functional). Alerts panel is 4 hardcoded strings, not live data.
- **Where the data comes from**: canonical `/api/dashboard/plan-balance` (demand/supply/inventory rollup) + `/api/data/*` revenue aggregates + active published scenario.

---

### Demand Planning > Forecast Overview

- **What's on screen**: Region/SKU filters + Reset. 4 KPI cards. Forecast Adjustment slider (−30%→+30%) with live readout. Actual-vs-Forecast(-vs-Adjusted) line chart. Per-SKU detail table with sparkline, accuracy bar, growth %.
- **What it's showing**: How actual sell-out compares to the statistical forecast, and what a manual adjustment would do to it.
- **Key interactions**: Slider recalculates chart/table live (client-side only, not saved).
- **Where the data comes from**: canonical `/api/data/weekly` (tertiary actual + secondary forecast).

### Demand Planning > AI/ML Forecasting

- **What's on screen**: Horizon (Short/Mid/Long) + Channel + Product filters. 3 KPI cards. Accuracy-by-horizon table. Line chart comparing Actual/Statistical/MLRF/XGBF/Applied. Lifecycle-aware method-assignment table.
- **What it's showing**: Which forecasting model is recommended per horizon and lifecycle stage, and how each model tracks actuals.
- **Key interactions**: Three filters (functional, client-side); rest read-only.
- **Where the data comes from**: `/api/data/weekly` plus deterministic POC Statistical/MLRF/XGBF outputs (not a trained model).

### Demand Planning > NPI & Lifecycle

- **What's on screen**: 3 KPI cards. Cards per NPI launch — editable launch week/curve/peak units/analog SKU/cannibalization %, readiness gate checklist, projected launch-curve chart. Below: lifecycle stage table (Product, Stage, Stage Since, Short/Mid/Long method).
- **What it's showing**: Readiness and demand ramp for new-product launches, and each SKU's lifecycle stage driving its forecast method.
- **Key interactions**: All NPI card fields and the lifecycle-stage dropdown save on change (functional).
- **Where the data comes from**: `/api/demand/npi-forecasts` + `/api/demand/lifecycle` (PLM_STAGE).

### Demand Planning > Event & Promotion Calendar

- **What's on screen**: "Create Event" button. 3 KPI cards. Baseline-vs-event-adjusted area chart. Managed event table (type, week range, scope, uplift, status, post-event accuracy). Create-event dialog.
- **What it's showing**: Which promotions/festivals are driving demand uplift, and how accurate the planned uplift was after the fact.
- **Key interactions**: Create Event (POST), inline uplift/status edits (PATCH) — all functional.
- **Where the data comes from**: canonical `/api/demand/events` (DEMAND_EVENT).

### Demand Planning > Channel Inventory Norms

- **What's on screen**: Channel-partner filter. 3 KPI cards. Table: SKU × channel, suggested DOS, editable planner-override field, effective/actual DOS, min/max band, status.
- **What it's showing**: Whether each SKU-channel is stocked to the system-recommended days-of-supply target, and where planners have overridden it.
- **Key interactions**: Override field saves on blur (functional, PATCH with auto reason).
- **Where the data comes from**: canonical `/api/demand/inventory-norms` (CHANNEL_INVENTORY_NORM).

### Demand Planning > Consensus Workflow

- **What's on screen**: "Acting as [Role]" dropdown. 3 KPI cards. Queue of per-SKU cards showing Statistical/Channel-submitted/Proposed values, a Category→Sales→S&OP→Finance progress trail, and Override/Approve/Reject controls. Audit trail table below.
- **What it's showing**: Where each SKU's forecast sits in the 4-step signoff chain and who needs to act next.
- **Key interactions**: Role switch gates which cards are actionable; Override/Approve/Reject are functional (PATCH, reason required for Override/Reject).
- **Where the data comes from**: `/api/demand/consensus-workflows` + shared `workflow_instances`/`workflow_steps`/`entity_audit_events`.

### Demand Planning > Channel Partner Data Integration

- **What's on screen**: 3 KPI cards. Table: channel partner, type/protocol dropdowns, data-availability toggle chips (sell-through/stock/DOS/returns), record count, last sync + "Mark feed received", freshness SLA dropdown, health badge, gap flag.
- **What it's showing**: Which channel feeds are healthy vs. stale/failed, and what data each partner actually supplies.
- **Key interactions**: All dropdowns, toggle chips, and "Mark feed received" are functional (PATCH).
- **Where the data comes from**: canonical `/api/demand/channel-integrations`, reusing the distributor/channel-partner master.

### Demand Planning > Product/Partner Listing Master

- **What's on screen**: 3 KPI cards. SKU × channel-partner matrix — each cell a status dropdown + "Manage details" link. Listing detail dialog (status, region, dates, MOQ, exclusivity).
- **What it's showing**: Which SKUs are actually listed/sellable on which channel, and since when.
- **Key interactions**: Cell status dropdown and dialog "Save Listing" are functional (PATCH).
- **Where the data comes from**: canonical `/api/demand/listings` (LISTING_MASTER).

### Demand Planning > KPI Dashboard

- **What's on screen**: 6 KPI cards (Forecast MAPE, Consensus Compliance, Norm Adherence, NPI Readiness, Event Uplift Accuracy, Channel Freshness) plus one horizontal bar chart comparing them.
- **What it's showing**: Closing scorecard — is demand planning healthy across all six governance metrics at once.
- **Key interactions**: None; read-only.
- **Where the data comes from**: aggregates from all six endpoints above.

---

### Demand Factors

- **What's on screen**: SKU dropdown + base-demand stat. Four factor toggles (PLC, Seasonality, Promotions, Location). Impact Summary (Base/Adjusted/Total Impact %). Base-vs-Adjusted 26-week line chart (promo weeks marked). Factor Impact Breakdown + Competitor comparison bar chart side by side. Regional Variation cards (only when Location is on). "Publish to Consensus" button.
- **What it's showing**: Isolated what-if — how much do PLC stage, seasonality, promotions, and region each move demand for one SKU.
- **Key interactions**: Toggles and SKU picker recompute live (client-side). "Publish to Consensus" is functional (POST). SKU list is 3 hardcoded demo SKUs, not the full catalog.
- **Where the data comes from**: hardcoded local constants — no API, not connected to canonical SKU/event data.

---

### Distributor Orders > Order Portal (main page)

- **What's on screen**: Demo-day + distributor selectors, lock badge. 4 KPI cards. Dealer Activation Opportunity table. Cashflow burn meter. SKU Order Sheet table (stock, secondary avg, clickable suggested qty, scheme badge, qty input, line value). Place Order footer (notes, totals, ETA, button). Recent Orders table.
- **What it's showing**: What quantity a distributor should reorder this cycle, whether they can still edit it (freeze window), and their order history.
- **Key interactions**: Apply Suggestions/Clear, suggested-qty click-to-fill, Place Order (POST), and per-order Review/Request/Edit — all functional.
- **Where the data comes from**: `/api/orders/suggest`, `/api/orders`, `/api/orders/rules`, `/api/orders/dealer-activation-gap`.

### Distributor Orders > Edit / Approval dialog

- **What's on screen**: Order header + lock/status badges. Rule banner explaining what's allowed. Pending-approval banner (if applicable). Line-item table with editable New Qty and Δ%. Summary tiles. State-dependent footer buttons (Save Changes / Request Approval / Approve & Apply / Reject).
- **What it's showing**: Line-by-line detail of a single order edit or approval request, with freeze-rule guardrails enforced.
- **Key interactions**: All footer actions are functional (PATCH `/api/orders/update`).
- **Where the data comes from**: same order record from `/api/orders`, mutated via `/api/orders/update`.

---

### Order vs Dispatch

- **What's on screen**: Distributor selector + Refresh. Data-source hint (Placed orders vs Suggested pipeline). 4 KPI cards. Grouped bar chart (Ordered vs Dispatched, top 14 SKUs). SKU execution table (gap rows highlighted). Static simulation-methodology note.
- **What it's showing**: Did the factory actually ship what the distributor ordered, per SKU.
- **Key interactions**: Distributor selector and Refresh are functional; table/chart are read-only.
- **Where the data comes from**: `/api/orders/dispatch-visibility`, reading placed orders with a **simulated** dispatch-quantity model (not real ASN/shipment data).

---

## Supply Planning (`/supply-planning/*`)

Shared chrome on every tab below: sticky header (role selector, current week, refresh, theme toggle) and a tab nav filtered by the active role's permissions.

### Supply Planning > Overview Cockpit

- **What's on screen**: Welcome banner + "Open Master Supply Workbench" button. Early-warning banner (if any risk). Two rows of 4 KPI cards (fulfillment, shortage, bottlenecks, warehouse stock / HOD adherence, supplier reliability, imports in-transit, NPI readiness). Demand-vs-Supply area chart with horizon/signal/portfolio filters. Three quick-launch cards to other workbenches.
- **What it's showing**: Executive-level health check — is supply keeping pace with demand right now, and where's the early risk.
- **Key interactions**: Quick-launch links, portfolio filter (re-fetches), horizon/signal filters (client-side re-slice) — all functional.
- **Where the data comes from**: `/api/v1/supply-planning?action=overview` + `action=early_warning_system`.

### Supply Planning > Input & Data Sources

- **What's on screen**: Provenance summary (category/record counts, overall health). Planning Input & Output Mapping Matrix table. Collapsible per-category schema-contract details. Planning Rules & Formulas table.
- **What it's showing**: Where every planning number ultimately comes from and which formula produced it — the "show your work" screen.
- **Key interactions**: None; entirely read-only reference material.
- **Where the data comes from**: `action=data_sources` metadata describing every canonical collection.

### Supply Planning > Supply Workspace

- **What's on screen**: SKU/Location/Horizon filters + "SKU 360° Detail" link + "Recalculate MRP" button. 52-week netting grid: demand, event adjustment, NPI reservation, stock, PO receipts, net requirement, capacity headroom, RM buildable, planned production, projected stock, gap, status. Horizon-zone legend (locked/queue/reservation bands).
- **What it's showing**: Week-by-week, can we make and ship enough of this SKU given current stock, open POs, BOM, and factory capacity.
- **Key interactions**: "Recalculate MRP" is a real functional write (persists a new MRP run); filters and the SKU 360° link are functional.
- **Where the data comes from**: `product_master`, `bom_master`, `inventory`, `purchase_orders`, `manufacturing_partner_lines`, `line_capacity_plans`, canonical event-adjusted demand; persists to `mrp_calculation_runs`/`mrp_calculation_lines`.

### Supply Planning > Supply Workspace > SKU 360° Detail

- **What's on screen**: Back link. 4 KPI cards (ASP, target GM, ABC/XYZ class, safety-stock days). Planning & Logistics parameters panel. Assembly BOM panel.
- **What it's showing**: Full planning profile for one SKU, reached by drilling in from the workspace or BOM tab.
- **Key interactions**: None beyond the back link; read-only.
- **Where the data comes from**: `product_master` + `bom_master` for the selected SKU.

### Supply Planning > Materials & BOM

- **What's on screen**: Parent-assembly dropdown + "Issue Component Purchase Orders" link. 3 KPI cards (component count, gating shortages, avg scrap %). Multi-level component netting table with Shortage/Feasible badges and per-row "Inspect SKU" link.
- **What it's showing**: Which raw-material/component shortages would block production of a given finished good.
- **Key interactions**: Parent-SKU dropdown, "Issue Component POs" link, and "Inspect SKU" links are all functional navigation; table itself is read-only.
- **Where the data comes from**: canonical `bom_master` filtered by parent SKU, joined to on-hand `inventory`.

### Supply Planning > Capacity Planning > Heatmap

- **What's on screen**: 3 shared KPI cards (utilization, active plants, total rated capacity) above a 4-way sub-tab switcher. Plant/line heatmap table with "Rebalance Line Load" button and per-row "Plant 360°" link.
- **What it's showing**: Which plants/lines are over- or under-utilized right now.
- **Key interactions**: "Rebalance Line Load" (not yet functional — alert-only stub). "Plant 360°" link is functional.
- **Where the data comes from**: plant/line capacity records (`plantData[]`).

### Supply Planning > Capacity Planning > Plant 360° Detail

- **What's on screen**: Back link. 3 KPI cards (daily/weekly rated capacity, OEE). Qualified assembly lines & SKU mappings panel. Active MES work orders panel.
- **What it's showing**: Full capacity and work-order profile for one plant.
- **Key interactions**: None beyond back link; read-only.
- **Where the data comes from**: plant/line master joined to active work orders.

### Supply Planning > Capacity Planning > OEE

- **What's on screen**: Rated-vs-actual table: rated capacity, planned workload, actual output, variance, downtime hours/reason, OEE %.
- **What it's showing**: How much of rated capacity each plant is actually converting into output, and why it's losing the rest.
- **Key interactions**: None; read-only.
- **Where the data comes from**: `ratedVsActual[]`.

### Supply Planning > Capacity Planning > Gap Analysis

- **What's on screen**: Short/Medium/Long horizon legend cards. Scrollable 52-week table: week, horizon tier badge, rated capacity, planned workload, capacity gap (units/hours), utilization %, CapEx event flag, status.
- **What it's showing**: Where capacity falls short of planned workload over the next year, and which weeks already have a planned expansion.
- **Key interactions**: None; read-only.
- **Where the data comes from**: `capacityGap[]` + `horizonLegend{}`.

### Supply Planning > Capacity Planning > Rough-Cut & Consensus Signoff

- **What's on screen**: Parent-SKU selector + gating-component note. Rough-cut production plan table (demand vs RM-buildable vs capacity-constrained, binding constraint, feasible flag). Consensus signoff panel (status badge, plan ID, latest stamp, state-gated action buttons, history log). Capacity-rebalancing recommendation cards with "Execute Action" buttons.
- **What it's showing**: The RM- and capacity-constrained production plan for a SKU, and whether it has been formally signed off (Draft→Review→Approved→Locked).
- **Key interactions**: Submit for Review / Approve / Publish & Lock are all functional (real state-machine writes). "Execute Action" on recommendation cards (not yet functional — alert-only stub).
- **Where the data comes from**: `roughCutPlan{}` + `consensusPlanStatus{}`, persisted via `workflow_instances`/`workflow_steps`/`entity_audit_events`.

### Supply Planning > Procurement POs > PO Queue

- **What's on screen**: 3 shared KPI cards (open PO units, vendor OTD %, MOQ compliance) above a 4-way sub-tab switcher. PO release queue table with "Batch Approve POs" button and per-row "Supplier 360°" link.
- **What it's showing**: Which purchase orders are open and awaiting release/approval.
- **Key interactions**: "Batch Approve POs" (not yet functional — alert-only stub). "Supplier 360°" link is functional.
- **Where the data comes from**: `pos[]`.

### Supply Planning > Procurement POs > Need Dates

- **What's on screen**: Table: PO, supplier, SKU, expected delivery, linked production order, production need date, date-gap days, alignment-risk badge.
- **What it's showing**: Will each PO arrive in time to feed the production order that needs it.
- **Key interactions**: None; read-only.
- **Where the data comes from**: `needDates[]`.

### Supply Planning > Procurement POs > HOD Adherence

- **What's on screen**: 3 KPI cards (on-time adherence %, at-risk/late count, excluded count). Table: PO, HOD, actual HOD, promised delivery, variance days, adherence badge, exclusion-reason dropdown, revision-count tooltip.
- **What it's showing**: Is each supplier hitting their contractual Handover Date, and which POs are formally excluded from that measure and why.
- **Key interactions**: Exclusion-flag dropdown is functional (PATCH, logs a revision).
- **Where the data comes from**: `hodAdherence[]` + `adherenceSummary{}`, exclusions persisted in `poExclusionStore`/`poRevisionStore`.

### Supply Planning > Procurement POs > ODM-EMS Master

- **What's on screen**: Vendor master table (type, tier, line count, total/contracted/spot capacity, NPI reserve, lead time) with "Supplier 360°" links. Ranked reliability scorecard table below (OTD 4/13/52wk, lead-time variance, quality/rejection rate, reliability grade).
- **What it's showing**: Who the manufacturing partners are, how much capacity each has, and how reliable they've been.
- **Key interactions**: "Supplier 360°" link is functional; rest read-only.
- **Where the data comes from**: `odmEmsMaster[]` + `reliabilityScorecard[]`.

### Supply Planning > Procurement POs > Supplier 360° Detail

- **What's on screen**: Back link. 3 KPI cards (quality score, OTD rate, standard lead time). 4/13/52-week performance history table. Operational profile panel. Active POs panel.
- **What it's showing**: Full performance dossier for one supplier.
- **Key interactions**: None beyond back link; read-only.
- **Where the data comes from**: supplier master + `reliabilityScorecard[]` + open `pos[]` for that supplier.

### Supply Planning > Network & Transfers > Domestic

- **What's on screen**: 3 KPI cards (active transfers in-transit, avg network coverage, imports in-transit). DC stock-coverage table (capacity, current stock, DOS, status) with "Create Transfer Order" button.
- **What it's showing**: How many days of supply each regional DC is carrying and where a transfer is needed.
- **Key interactions**: "Create Transfer Order" (not yet functional — alert-only stub).
- **Where the data comes from**: `networkData[]`.

### Supply Planning > Network & Transfers > Import Control Tower

- **What's on screen**: RM/FG count chips. Import shipment table: PO/SKU, origin/mode, carrier/BoL, ETA, units in-transit, clearance status (+ demurrage note), lead-time buffer, duty+freight cost.
- **What it's showing**: Where every in-transit import shipment is and whether customs delays threaten the plan.
- **Key interactions**: None; read-only.
- **Where the data comes from**: import shipment records (RM/FG classified POs).

### Supply Planning > Constraints & Risks

- **What's on screen**: 3 KPI cards (active exceptions, revenue at risk, AI engine status). Executive recommendation cards with metrics + "Approve Executive Trade-Off" button. Active constraint exception table (severity, description, AI recommendation). Row click opens a drawer: root-cause tree, AI mitigation text, required resolution-reason field, "Mark Resolution Executed" button.
- **What it's showing**: What's actively at risk in the supply chain right now, why (root cause), and what to do about it.
- **Key interactions**: "Approve Executive Trade-Off" and "Mark Resolution Executed" are both functional real writes (reason required for resolution).
- **Where the data comes from**: `supply_constraints` composed with canonical `demand_events`, `channel_inventory_norms`, and `supplier_reliability_history`.

### Supply Planning > Scenario Studio

- **What's on screen**: 3 KPI cards (active scenarios, cost variance vs baseline, service-level delta). Comparison table: scenario name, assumption, generated plan link, cost variance, service delta, revenue-risk recovered, per-row Publish button. "Build New Scenario" button.
- **What it's showing**: Side-by-side comparison of saved what-if scenarios against the baseline, ready to publish one as the official plan.
- **Key interactions**: Per-row "Publish" is functional (materializes into the active consensus plan). "Build New Scenario" (not yet functional — alert-only stub).
- **Where the data comes from**: canonical `scenario_versions`, `scenario_assumption_sets`, `scenario_output_lines`.

---

### Inventory Planning (top-level page)

- **What's on screen**: Refresh button. 4 KPI cards (segmented SKUs, effective safety stock, exceptions, erratic demand). 3×3 ABC/XYZ matrix (clickable cells) beside an Optimizer Inputs explainer. Norm Policy Workbench table (segment, demand/CV, lead time, suggested/effective DOS & safety stock, ROP, status, "Configure" button per row) with a Configure-policy dialog.
- **What it's showing**: How each SKU is segmented and whether its current inventory policy (safety stock, DOS) matches the system's recommendation.
- **Key interactions**: Matrix-cell click and category/segment filters (client-side); "Configure" → dialog "Save Policy" is functional (PATCH).
- **Where the data comes from**: canonical `/api/inventory/policies`, using Demand Planning's tertiary demand variability and Supply Planning's lead times/MOQ.

### Inventory Planning > Reorder Recommendations

- **What's on screen**: 4 KPI cards (recommended order, order-now count, planned releases, covered SKUs). Cadence dropdown (Weekly/Monthly/On-request). Table: lead time+MOQ, inventory position, open PO/next due, order-up-to qty, recommended qty, release date, status.
- **What it's showing**: What to reorder, how much, and by when, netted against open POs.
- **Key interactions**: Cadence dropdown is functional (re-fetches with new cadence).
- **Where the data comes from**: `/api/inventory/planning`, netting open `purchase_orders` against policy from `/api/inventory/policies`.

### Inventory Planning > Stocking Scenarios

- **What's on screen**: Editable assumption inputs (demand %, target-DOS days, inbound-realization %). 12-week projected-inventory line chart (Lean/Baseline/Resilient/Custom). Scenario comparison cards (ending inventory, average inventory, lost-demand units).
- **What it's showing**: How inventory position and stockout risk would play out under four different stocking postures.
- **Key interactions**: The three assumption inputs are functional and update the chart/cards live.
- **Where the data comes from**: `/api/inventory/planning` with scenario adjustment parameters.

### Inventory Planning > Health Check

- **What's on screen**: 5 KPI cards (stockout risk, excess, obsolete candidates, DOS outliers, healthy). Prioritized table: actual/norm DOS, inventory/max, projected-at-receipt, open PO, exposure units, health flag badges.
- **What it's showing**: Which SKUs need attention right now — at risk of stockout, sitting excess, or possibly obsolete.
- **Key interactions**: None; read-only, flagged rows sorted first.
- **Where the data comes from**: `/api/inventory/planning` health diagnostics.

---

### Scenario Planning

- **What's on screen**: 3 assumption sliders (Demand Uplift, Input Cost Shift, Capacity Change) with live readouts. "Scenario vs Baseline" quarterly bar chart (baseline/scenario/GM). Saved Scenarios table (owner, revenue Δ, GM Δ, status, per-row Publish). "New Scenario" button.
- **What it's showing**: Quarterly revenue/GM impact of a live what-if, alongside the canonical saved scenarios available to publish as the official plan.
- **Key interactions**: Sliders recompute the chart live (client-side preview only, not saved). Per-row "Publish" is functional. "New Scenario" (not yet functional — no click handler).
- **Where the data comes from**: `/api/data/kpis` for the live slider chart; canonical `scenario_versions`/`scenario_assumption_sets`/`scenario_output_lines` for the Saved Scenarios table; publish writes `consensus_plan_versions`/`consensus_plan_lines`.
