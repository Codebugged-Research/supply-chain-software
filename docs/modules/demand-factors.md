# Demand Factors Module — Architecture Inventory

> **Module nav id:** `factors`
> **Status:** Functional — fully built, hardcoded demo SKUs (3 featured SKUs, not driven by live `/api/data/skus`)
> **Source:** `app/page.js` → `DemandFactorsPage` component (lines ~3096–3599)
> **API endpoints:** None — entirely local computation, no API calls
> **Last audited:** 2026-08-11

---

## 1. Purpose

Interactive visualization of factors impacting demand forecasting for a selected SKU. Allows planners to toggle on/off four demand drivers (PLC stage, Seasonality, Promotions, Location) and see the combined impact on a 26-week demand forecast, with a competitor comparison bar chart and regional demand variation breakdown.

---

## 2. Build Status

**Functional.** All charts and interactions work. However:
- SKU list is **hardcoded** to 3 featured SKUs (`SKU-BOAT-LD100`, `SKU-BOAT-AD141`, `SKU-BOAT-BH100`) — not driven by `/api/data/skus`
- All factor multipliers (PLC, seasonality patterns, promo uplift, regional multipliers) are **hardcoded constants** in the component — not configurable from any data source or API
- Competitor data is **hardcoded mock** (boAt, Noise, JBL)
- No writes — the factor toggles affect only local `factors` state

---

## 3. Data Entities Read

| Source | Fields used | Where |
|---|---|---|
| Hardcoded `featuredSkus[]` | `id`, `name`, `category`, `plc`, `baseDemand` | SKU selector dropdown |
| Hardcoded `seasonalityPatterns{}` | Monthly multiplier arrays per category | Seasonality factor applied to weekly demand |
| Hardcoded `plcMultipliers{}` | `New=1.2`, `Growth=1.5`, `Mature=1.0`, `Decline=0.7` | PLC factor |
| Hardcoded `regionMultipliers{}` | Per-region, per-category multiplier (North/South/West) | Location factor |
| Hardcoded `promotionWeeks[]` + `promotionUplift` | Weeks 8, 9, 15, 16, 22, 23 · +40% uplift | Promotion factor |
| Hardcoded `competitorData[]` | boAt/Noise/JBL mock baseDemand multiples | Competitor comparison BarChart |

**Writes:** None.

---

## 4. Key UI Components / Widgets

| Widget | Description |
|---|---|
| SKU `<Select>` | 3 hardcoded SKU options with category badge |
| 4× Factor toggle rows | PLC / Seasonality / Promotions / Location — toggles `factors` state, re-computes `demandData` |
| Impact Summary bar (`<Card>`) | Base Demand / Adjusted Demand / Total Impact % — computed from `calculateImpact()` |
| `LineChart` | Base Demand (grey) + Adjusted Demand (blue) — 26 weeks; promotion weeks shown as red dots on the adjusted line |
| Factor Impact Breakdown card | Per-factor impact % display (toggleable) |
| Competitor `BarChart` (horizontal) | boAt / Noise / JBL — `baseDemand × fixed_multiple`, colored per brand |
| Regional Variation grid | 3 cards (North/South/West) — shown only when Location factor is active |

---

## 5. Overlap / Relationship with Other Modules

| Module | Relationship |
|---|---|
| **Demand Planning** | Demand Factors remains a standalone what-if visualization. Demand Planning now owns API-backed `PLM_STAGE` and `DEMAND_EVENT` records, including managed event scope and baseline uplift overlays. Demand Factors still does not consume those records. |
| **Supply Planning → Scenario Studio** | Both provide what-if modeling (sliders → impact), but in different scopes: Demand Factors models demand-side decomposition (PLC × seasonality × promo × location); Scenario Studio models quarterly revenue/GM/capacity scenarios. Complementary. |
| **Financial Planning** | Demand Factors' PLC and seasonality adjustments to `baseDemand` are conceptually the upstream inputs that Financial Planning's `demandUplift` slider approximates at a macro level. No data handoff currently. |

---

## 6. BOAT Requirement Mapping & Gaps

| BOAT Requirement | Coverage Status | Mapping / Implementation Notes |
|---|---|---|
| **Demand Planning #4: Product Lifecycle Management (PLM)** | **Partially Covered** | Visualizes PLC stage multipliers (Growth × 1.5, Mature × 1.0, Decline × 0.7). Hardcoded to 3 demo SKUs and not connected to core SKU master or Demand Planning tab. |
| **Demand Planning #5: Event/Promotion Calendar Engine** | **Prototype only here; implemented in Demand Planning** | This module visualizes +40% promo uplift across 6 hardcoded campaign weeks but has no calendar/event structure. Demand Planning now supplies managed `DEMAND_EVENT` records, scoped uplift overlays and post-event accuracy. |

> **Duplication Prevention Note:** The local factor toggles remain useful for isolated what-if exploration. Governed PLM and Event Calendar management are implemented in Demand Planning and are not duplicated here.

---

## 7. Key Integration Gap

Demand Factors computes adjusted demand in isolation. There is no mechanism to:
1. Push the adjusted demand figure back to the Demand Planning tab as the "adjusted forecast"
2. Configure the PLC stage from a real `SKU_MASTER.plcStage` field
3. Configure promotions from a real `DEMAND_EVENT` entity
4. Expand the SKU list beyond the 3 hardcoded entries

This module is effectively a **demo/prototyping tool** — it should be refactored to consume real entity data and feed output into the Demand Planning consensus workflow.
