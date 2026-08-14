# Scenario Planning Module — Architecture Inventory

> **Module nav id:** `scenario`
> **Status:** Functional canonical scenario reads and publication; interactive slider simulation remains a local unsaved preview
> **Source:** `app/page.js` → `ScenarioPage` component (lines ~2954–3093)
> **API endpoints:** `/api/data/kpis`, `GET /api/scenarios`, `POST /api/scenarios/publish` (plus Supply Studio compatibility actions)
> **Last audited:** 2026-08-13

---

## 1. Purpose

Models what-if scenarios against the consensus plan at a quarterly revenue / gross margin level. Three interactive sliders (Demand Uplift, Input Cost Shift, Capacity Change) feed a live quarterly projection bar chart (Q1–Q4, showing baseline vs scenario vs gross margin). Also shows a hardcoded "Saved Scenarios" table with mock records.

---

## 2. Build Status

**Partially built.**

| Component | Status | Notes |
|---|---|---|
| 3× slider inputs | Functional | Demand Uplift (−20→+30%), Input Cost Shift (−10→+25%), Capacity Change (−15→+20%) |
| Scenario vs Baseline BarChart | Functional | Live computation from `kpis.totalRevenue` and `kpis.totalGm` split into quarterly baseline, then scaled by slider values |
| Saved Scenarios table | **Canonical** | Reads `scenario_versions`, `scenario_assumption_sets`, and exact aggregates of `scenario_output_lines` |
| "New Scenario" button | Stub | `<Button>` with no onClick handler |
| Cross-module scenario publish | **Functional** | A built REVIEW/APPROVED version can be published; one version becomes active, its outputs materialize into a new consensus plan version/lines, and Dashboard/Demand Planning read the same selected version |

---

## 3. Data Entities Read

| Source | Fields used | Where |
|---|---|---|
| `/api/data/kpis` → `kpis{}` | `totalRevenue`, `totalGm` | Quarterly baseline computation — `quarterlyBaseline = totalRevenue / 2` (6-month data split to 1 quarter) |

**Writes:** `POST /api/scenarios/publish` changes the selected version to `PUBLISHED`, archives any prior published selection, writes `consensus_plan_versions.sourceScenarioVersionId` plus aggregated `consensus_plan_lines`, and appends an `entity_audit_events` publication event. Slider state remains a local preview.

### Publication contract

Publication is allowed only when `runAt` and canonical `scenario_output_lines` exist. `DRAFT` and `RUNNING` versions cannot be published; an archived immutable version may be selected again. Repeat publication of the active version is idempotent.

The selected scenario is the latest `scenario_versions` row with `status=PUBLISHED`. Its outputs are pushed to `CPV-<scenarioVersionId>-PUBLISHED`, whose `sourceScenarioVersionId` points back to the immutable scenario. Output rows are aggregated from SKU × channel × location × week to canonical consensus-plan SKU × week grain without reconstructing scenario quantities.

| Consumer | Active-scenario behavior |
|---|---|
| Dashboard | `/api/dashboard/plan-balance` uses published demand, supply, inventory, unmet-demand, and capacity output values with scenario lineage |
| Demand Planning | Forecast Overview resolves published `scenarioDemandQty` at SKU × channel × week and labels the selected scenario |
| Supply/consensus consumers | Read the approved/published consensus-plan version and lines selected through `sourceScenarioVersionId` |

**Quarterly scenario formula:**
```
scenarios[q].baseline = quarterlyBaseline × (1 + q × 0.02)
requestedFactor       = 1 + demand[0]/100 + q×0.02
capacityFactor        = 1.2 × (1 + capacity[0]/100)
deliverableFactor     = min(requestedFactor, capacityFactor)
scenarios[q].scenario = baseline × deliverableFactor
scenarios[q].gm       = scenario − (baselineCOGS × (1 + cost[0]/100) × (1 + q×0.015) × deliverableFactor)
```
The shared `buildWhatIfScenarioComparison()` calculation now applies capacity as a deliverability constraint. Dashboard reuses this calculation for read-only named comparisons rather than implementing a second scenario engine.

---

## 4. Key UI Components / Widgets

| Widget | Description |
|---|---|
| Demand Uplift `Slider` | −20% to +30%, step 1% — scales quarterly scenario revenue |
| Input Cost Shift `Slider` | −10% to +25%, step 1% — scales quarterly gross margin |
| Capacity Change `Slider` | −15% to +20%, step 1% — constrains deliverable scenario revenue through the shared scenario calculation |
| `BarChart` (3-bar grouped, Recharts) | Q1–Q4: Baseline (grey) / Scenario (blue) / GM (green) — ₹M |
| Saved Scenarios `DataTable` | Canonical version rows with stored outcome aggregates, lifecycle status, active marker, and Publish action |
| "New Scenario" button | UI stub — no action |

---

## 5. Overlap / Relationship with Other Modules

| Module | Relationship |
|---|---|
| **Financial Planning** | Both have demand uplift and cost shift sliders for P&L what-if modeling. Financial Planning is finer-grained (weekly, 5 sliders, full P&L bridge, per-SKU profitability). Scenario Planning is coarser (quarterly, 3 sliders, revenue + GM only). These overlap in purpose and should eventually share a scenario state object — define a scenario, propagate its assumptions to Financial Planning for detail review before saving. |
| **Supply Planning → Scenario Studio** | Both scenario surfaces read the same canonical catalog and call the same publication service; no parallel publish state exists. |
| **Demand Planning** | Locked consensus remains the scenario baseline; once published, canonical output becomes the selected forecast view while retaining its baseline-plan reference. |

---

## 6. BOAT Requirement Mapping & Gaps

| BOAT Requirement | Coverage Status | Mapping / Implementation Notes |
|---|---|---|
| **S&OP Portal #4: What If Scenario comparison** | **Implemented** | Canonical versions, assumptions, and outputs drive saved comparisons; the published selection is shared with Dashboard and Demand Planning. |
| **Supply Planning #6: Consensus Production Planning Signoff** | **Implemented precursor** | Publication creates an approved downstream consensus-plan version and lines with exact scenario lineage; locking remains the existing signoff workflow's responsibility. |

---

## 7. Key Bugs / Issues

1. **Quarterly baseline is halved from 6-month data** — `quarterlyBaseline = kpis.totalRevenue / 2` is correct only if the underlying data covers exactly 6 months; if the dataset changes, the baseline denominator is not recalculated.
2. **Slider preview is not a scenario builder** — Publication operates on already-built canonical versions. Persisting slider changes as a new version/assumption set and executing the output engine remains separate authoring work.
