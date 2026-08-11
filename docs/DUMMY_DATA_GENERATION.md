# Dummy Data Generation & Synthetic Modeling Specification

> **Module Scope:** Comprehensive Technical Documentation of all Dummy / Mock Data Generation Codes, Formulas, Seeds, and Simulation Algorithms across the S&OP Suite.
> **Target Audience:** Engineering Leads, Data Architects, Technical Reviewers, Stakeholders.
> **Date:** 2026-08-11
> **Repository Base:** `d:\Companies worked with\POCs\supply-chain-software`

---

## 1. Executive Summary & Architecture Overview

The boAT S&OP Planning Suite relies on a **deterministic, multi-layered synthetic data engine**. The architecture is specifically designed to provide realistic business behaviors—including seasonal demand curves, forecast accuracy convergence over time, supply dispatches, dealer channel activation gaps, inventory ABC/XYZ classifications, cashflow aging profiles, and exception alerts—**without external backend dependencies**.

### Key Architectural Layers for Synthetic Data

```
+-----------------------------------------------------------------------------------+
| 1. Central Seeded PRNG Generator (lib/dummyData.js)                              |
|    • Seeded Mulberry32 PRNG (seed: 20250701)                                      |
|    • Master Entities: 15 SKUs, 5 Distributors, 3 Regions, 26 Weekly Buckets      |
|    • Generates: Tertiary (Sell-out), Secondary (Sell-in), Primary (Dispatch)     |
|    • Implements: Cosine Seasonality, Demand Shocks, Inventory Accumulation Logic  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 2. Analytical & Rule Engines (app/api/[[...path]]/route.js)                      |
|    • Inventory Policy Optimizer: ABC (Pareto) & XYZ (CV) Segmentation             |
|    • Safety Stock Calculator: Service level Z-score lookup + Lead time sqrt      |
|    • Order Suggestion Engine: 4-week target cover netting                         |
|    • Dealer Activation Gap: Stable FNV-1a string hashing for dealer velocity     |
|    • Dispatch Execution Simulator: Supply adequacy ratios + Tier service nudges   |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 3. Supply Planning Studio Service Layer (lib/supplyChainService.js)               |
|    • Fallback Pipeline: MongoDB -> output/*.json -> Hardcoded Fallbacks          |
|    • Time-Phased MRP Netting: 52-week rolling production/purchase plan grid       |
|    • Import Control Tower: Container shipments, duty/freight INR, demurrage       |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 4. Client-Side Curve Shaping & Factor Engines (app/page.js)                       |
|    • Recharts Multipliers: DASH_ACTUAL_SHAPE, FORECAST_SHAPE, REVENUE_SHAPE       |
|    • Demand Factor Decomposition: PLC x Seasonality x Promo (+40%) x Region       |
|    • Financial P&L & Cashflow: AR aging profiles by distributor segment           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Seeded Data Generator (`lib/dummyData.js`)

### 2.1 Seeded Pseudo-Random Number Generator (Mulberry32)

To ensure **100% mathematical reproducibility** across server restarts, browser reloads, and different operating systems, all random numbers in the core dataset are produced by a seeded Mulberry32 PRNG algorithm.

```javascript
function mulberry32(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20250701) // Fixed Seed: July 1, 2025
const rnd = (min, max) => min + rand() * (max - min)
```

- **Seed**: `20250701`
- **Output**: Uniform float in range `[0, 1)`.

---

### 2.2 Master Data Schema & Base Parameters

#### SKUs (15 Products across 5 Categories)

Each SKU defines baseline weekly volume, retail price, COGS, seasonal peak week, amplitude, and linear trend growth coefficient:

| SKU Code | Product Name | Category | Price (₹) | Cost (₹) | Base Wkly Qty | Peak Wk | Season Amp | Growth / Wk |
|---|---|---|---|---|---|---|---|---|
| `SKU-BOAT-AD141` | boAt Airdopes 141 | TWS Earbuds | 1,499 | 950 | 1,400 | W44 | 0.28 | +0.8% |
| `SKU-BOAT-AD131` | boAt Airdopes 131 | TWS Earbuds | 1,299 | 820 | 1,600 | W43 | 0.24 | +0.5% |
| `SKU-BOAT-AD161P`| boAt Airdopes 161 Pro | TWS Earbuds | 1,999 | 1,300 | 900 | W45 | 0.32 | +1.2% |
| `SKU-BOAT-RZ255` | boAt Rockerz 255 Pro+| Neckbands | 1,299 | 800 | 1,100 | W30 | 0.22 | +0.4% |
| `SKU-BOAT-RZ245` | boAt Rockerz 245v2 | Neckbands | 999 | 620 | 1,350 | W29 | 0.20 | +0.2% |
| `SKU-BOAT-RZ330` | boAt Rockerz 330 Pro | Neckbands | 1,499 | 950 | 700 | W31 | 0.25 | +0.7% |
| `SKU-BOAT-WC100` | boAt Wave Connect | Smartwatches | 1,799 | 1,150 | 850 | W45 | 0.30 | +1.5% |
| `SKU-BOAT-LD100` | boAt Lunar Discovery | Smartwatches | 2,999 | 1,950 | 420 | W46 | 0.34 | +1.8% |
| `SKU-BOAT-XT200` | boAt Xtend | Smartwatches | 3,299 | 2,150 | 300 | W44 | 0.30 | +1.0% |
| `SKU-BOAT-ST350` | boAt Stone 350 | Portable Speakers | 2,999 | 1,900 | 380 | W47 | 0.36 | +0.9% |
| `SKU-BOAT-ST1508`| boAt Stone 1508 | Portable Speakers | 5,999 | 3,900 | 150 | W48 | 0.40 | +0.6% |
| `SKU-BOAT-PP20`  | boAt Party Pal 20 | Portable Speakers | 8,999 | 5,900 | 70 | W49 | 0.45 | +1.1% |
| `SKU-BOAT-BH100` | boAt Bassheads 100 | Wired Audio | 399 | 240 | 2,200 | W20 | 0.14 | -0.2% |
| `SKU-BOAT-BH225` | boAt Bassheads 225 | Wired Audio | 599 | 360 | 1,500 | W22 | 0.16 | -0.1% |
| `SKU-BOAT-IM201` | boAt Immortal IM 201 | Wired Audio | 699 | 430 | 950 | W25 | 0.18 | +0.3% |

#### Distributors (5 Channel Hubs)

Distributors carry regional classifications and volume scaling factors (`DIST_FACTOR`):

| ID | Name | Region | Tier | Volume Factor | Lead Time |
|---|---|---|---|---|---|
| `DST-001` | boAt North Distribution Hub | North | A | **1.30** | 3 days |
| `DST-002` | Western India Audio Channel Partners | West | A | **1.10** | 5 days |
| `DST-003` | Northland Electronics Distributors | North | B | **0.85** | 3 days |
| `DST-004` | South India Digital Retail Network | South | A | **1.15** | 4 days |
| `DST-005` | West Bharat Consumer Electronics Traders | West | C | **0.60** | 5 days |

---

### 2.3 Mathematical Data Generation Pipeline

The central dataset generates **1,950 total weekly record rows** (15 SKUs × 5 Distributors × 26 Weeks).

```
  For each SKU s in SKUS:
    For each Distributor d in DISTRIBUTORS:
      Initialize:
        distStock  = baseWeekly_s * DIST_FACTOR_d * rnd(1.8, 2.4)
        retailStock = baseWeekly_s * DIST_FACTOR_d * rnd(0.6, 1.1)

      For each Week w (index 0 to 25):
        1. Compute Seasonality Index
        2. Compute Growth Trend Factor
        3. Compute Consumer Demand (Tertiary)
        4. Compute Forecast Error Spread & Secondary Forecast
        5. Compute Factory Dispatch (Primary Supply)
        6. Update Pipeline Inventory Position
        7. Compute Price & Cost Variance
```

#### Step 1: Cosine Seasonality Curve
$$\text{Seasonality}(w) = 1 + \text{amplitude}_s \times \cos\left( \frac{w_{\text{num}} - \text{peak}_s}{52} \times 2\pi \right)$$

#### Step 2: Linear Growth Trend
$$\text{Trend}(\text{idx}) = 1 + \text{growth}_s \times \text{idx}$$

#### Step 3: Consumer Demand (Tertiary Sales)
$$\text{Tertiary}_{s,d,w} = \max\left(0, \text{round}\left( \text{baseWeekly}_s \times \text{DIST\_FACTOR}_d \times \text{Seasonality}(w) \times \text{Trend}(\text{idx}) \times \text{rnd}(0.88, 1.12) \right)\right)$$

#### Step 4: Secondary Forecast (Distributor Sell-in) with Learning Curve & Shocks
- **Convergence Spread**: Forecast error shrinks over time as planning algorithms "learn":
  $$\text{forecastLo}(\text{idx}) = 0.65 + 0.30 \times \left(\frac{\text{idx}}{25}\right) \quad (0.65 \rightarrow 0.95)$$
  $$\text{forecastHi}(\text{idx}) = 1.45 - 0.32 \times \left(\frac{\text{idx}}{25}\right) \quad (1.45 \rightarrow 1.13)$$
- **Demand Shock Weeks**: At `idx = 6` (Week 7) and `idx = 17` (Week 18), a demand shock is forced:
  $$\text{forecastMult} = \text{rnd}(0.68, 0.84) \quad \text{for } \text{idx} \in \{6, 17\}$$
- **Secondary Forecast Unit Output**:
  $$\text{Secondary}_{s,d,w} = \max\left(0, \text{round}(\text{Tertiary}_{s,d,w} \times \text{forecastMult})\right)$$

#### Step 5: Primary Supply (Factory to Distributor Dispatch)
$$\text{Primary}_{s,d,w} = \max\left(0, \text{round}(\text{Secondary}_{s,d,w} \times \text{rnd}(0.85, 1.35))\right)$$

#### Step 6: Multi-Echelon Pipeline Stock Accumulation
$$\text{distStock}_{t} = \max\left(0, \text{distStock}_{t-1} + \text{Primary}_t - \text{Secondary}_t\right)$$
$$\text{retailStock}_{t} = \max\left(0, \text{retailStock}_{t-1} + \text{Secondary}_t - \text{Tertiary}_t\right)$$

#### Step 7: Pricing & Revenue Accounting
- **Random Promotional Discount (8% probability)**: $\text{Price}_t = \text{round}(\text{Price}_{\text{list}} \times \text{rnd}(0.85, 0.92), 2)$
- **COGS Fluctuation**: $\text{Cost}_t = \text{round}(\text{Cost}_{\text{base}} \times \text{rnd}(0.98, 1.04), 2)$
- **Revenue**: $\text{Revenue}_t = \text{round}(\text{Price}_t \times \text{Secondary}_t, 2)$
- **Gross Margin**: $\text{GM}_t = \text{round}((\text{Price}_t - \text{Cost}_t) \times \text{Secondary}_t, 2)$

---

## 3. Specialized Rule Engines & Synthesizers

### 3.1 Order Suggestion Engine (`suggestOrders`)

Calculates recommended primary replenishment order quantities for distributors based on 4-week stock cover targets:

$$\text{suggestedQty} = \max\left(0, \text{round}(\overline{\text{Secondary}}_{\text{weekly}} \times 4 - \text{distributorStock}_{\text{latest}})\right)$$

- **High Demand Threshold**: Calculated dynamically by sorting all SKU network averages and selecting the **top 25th percentile value**.
- **Deterministic Promotional Scheme Rules**:
  - `Neckbands` (W24-W34): *"Back-to-campus cashback 6%"* (6% discount)
  - `TWS Earbuds` (W40+): *"Festive combo bonus 5%"* (5% discount)
  - `Smartwatches` (High Demand): *"Smartwatch bundle rebate 4%"* (4% discount)

---

### 3.2 Dealer Activation Opportunity Engine (`buildDealerActivationGap`)

Estimates channel stocking width vs active reordering dealers without maintaining external telemetry:

#### FNV-1a String Hash Generator (`stableUnit01`)
Used for stateless, deterministic per-SKU/distributor noise generation:
```javascript
function stableUnit01(seed) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return (h % 10_000) / 10_000
}
```

#### Dealer Count Formulations
- **Registered Dealers**: $\text{Base}_{\text{tier}} + \text{Adj}_{\text{region}}$ ($Tier A = 420, B = 300, C = 190; North = +20, South = +10, West = 0$).
- **Stocked Dealers**:
  $$\text{stockCoverFactor} = \frac{\text{retailStock}}{\max(1, \overline{\text{Secondary}}_{4\text{W}} \times 2.2)}$$
  $$\text{stockedRatio} = \text{clamp}\left(0.18, 0.94, 0.36 + \text{stockCoverFactor} \times 0.26 + \text{hashNoise} \times 0.1\right)$$
  $$\text{stockedDealers} = \text{round}(\text{registeredDealers} \times \text{stockedRatio})$$
- **Active Dealers**:
  $$\text{activeDealers} = \text{clamp}\left(0, \text{stockedDealers}, \text{round}\left(\frac{\text{Secondary}_{\text{last}}}{2.5 + \text{hashNoise} \times 4.0}\right)\right)$$

---

### 3.3 Dispatch Visibility Execution Simulator (`buildDispatchVisibilityRows`)

Simulates factory dispatch fulfillment percentages against placed primary orders:

1. **Supply Adequacy Ratio**: $\text{ratio} = \frac{\text{Primary}_{\text{last}}}{\text{Secondary}_{\text{last}}}$
2. **Tier Nudge**: $Tier A = +0.06, Tier B = 0.00, Tier C = -0.07$
3. **Simulated Fill Rate**:
   $$\text{fill} = \text{clamp}\left(0.28, 0.995, 0.58 + 0.34 \times \left(\frac{\text{clamp}(0.5, 1.45, \text{ratio}) - 0.5}{0.95}\right) + \text{tierNudge} + \text{hashJitter}\right)$$
4. **Dispatched Quantity**: $\text{dispatchedQty} = \text{round}(\text{orderedQty} \times \text{fill})$

---

## 4. Analytical Inventory Policy Engine (`app/api/[[...path]]/route.js`)

Dynamically computes **ABC/XYZ Inventory Segmentation**, **Statistical Safety Stock**, and **Reorder Points** over the synthetic dataset.

### 4.1 ABC Pareto Classification (Revenue Value)
- **Calculation**: $\text{ConsumptionValue}_s = \sum_{w=1}^{26} (\text{Tertiary}_{s,w} \times \text{Price}_{s,w})$
- **Pareto Cutoffs**:
  - **Class A**: Top 80% of cumulative monetary value $\rightarrow$ Target Service Level: **98%**
  - **Class B**: Next 15% (80% to 95%) $\rightarrow$ Target Service Level: **95%**
  - **Class C**: Remaining 5% (95% to 100%) $\rightarrow$ Target Service Level: **90%**

### 4.2 XYZ Volatility Classification (Coefficient of Variation)
- **Formula**:
  $$\mu = \frac{1}{N} \sum \text{Tertiary}_w, \quad \sigma = \sqrt{\frac{1}{N} \sum (\text{Tertiary}_w - \mu)^2}, \quad \text{CV} = \frac{\sigma}{\mu}$$
- **Volatility Cutoffs**:
  - **Class X (Stable)**: $\text{CV} \le 0.25$
  - **Class Y (Variable)**: $0.25 < \text{CV} \le 0.50$
  - **Class Z (Erratic)**: $\text{CV} > 0.50$

### 4.3 Safety Stock & Reorder Point Formulation

#### Service Level Z-Score Lookup
$$Z(99\%) = 2.33, \quad Z(98\%) = 2.05, \quad Z(97\%) = 1.88, \quad Z(95\%) = 1.65, \quad Z(90\%) = 1.28$$

#### Standard Safety Stock Formula
$$\text{SafetyStock}_s = \left\lceil Z(\text{ServiceLevel}) \times \left(\frac{\sigma_{\text{weekly}}}{\sqrt{7}}\right) \times \sqrt{\text{LeadTimeDays}} \right\rceil$$

#### Reorder Point & Max Inventory Thresholds
$$\text{ReorderPoint}_s = \text{round}\left( \text{DailyDemand}_{\text{avg}} \times \text{LeadTimeDays} + \text{SafetyStock}_s \right)$$
$$\text{SuggestedDOS}_s = \text{clamp}\left(7, 90, \left\lceil \text{LeadTimeDays} + \frac{\text{SafetyStock}_s}{\text{DailyDemand}_{\text{avg}}} \right\rceil \right)$$
$$\text{MaxInventory}_s = \text{round}\left( \text{DailyDemand}_{\text{avg}} \times \text{SuggestedDOS}_s + \text{SafetyStock}_s \right)$$

#### Automated Health Status Categorization
$$\text{InventoryStatus} = \begin{cases} \text{REORDER} & \text{if } \text{CurrentStock} < \text{ReorderPoint} \\ \text{EXCESS} & \text{if } \text{CurrentStock} > 1.25 \times \text{MaxInventory} \\ \text{HEALTHY} & \text{otherwise} \end{cases}$$

---

## 5. Supply Planning Studio Service Layer (`lib/supplyChainService.js`)

### 5.1 Data Fallback Hierarchy

To ensure the application functions regardless of database availability, `supplyChainService.js` executes a 3-tier fallback pipeline:

```
MongoDB Database Query (getDb())
      │
      ├─► [Failure / Empty] ──► Read Local JSON Files (output/*.json)
                                        │
                                        └─► [Missing Files] ──► Hardcoded Pure Synthetic Code Generators
```

### 5.2 Synthetic Service Level Agreement (SLA) Metric
$$\text{CalculatedSLA} = 100 - \left( \frac{\text{totalDeficitUnits}}{\text{totalForecastUnits}} \right) \times 100$$
$$\text{ServiceLevel} = \text{clamp}(92.0\%, 94.8\%, \text{CalculatedSLA})$$

### 5.3 Synthetic Import Control Tower Data Structure
Provides 4 pre-configured shipping containers for international supply visibility testing:

| Shipment ID | Type | Carrier | B/L Number | Mode | ETA | Clearance Status | Duty & Freight (₹) | Risk |
|---|---|---|---|---|---|---|---|---|
| `IMP-RM-26081` | RM | Maersk | `MAEU-8842136` | Ocean | +5 Days | `DOCUMENTATION` | 13,80,000 | `WATCH` |
| `IMP-FG-26076` | FG | CMA CGM | `CMDU-7719042` | Ocean | +1 Day | `CUSTOMS_HOLD` | 9,20,000 | **`CRITICAL`** |
| `IMP-RM-26083` | RM | Cathay Cargo | `CX-16049382` | Air | Today | `IN_TRANSIT` | 16,40,000 | `HEALTHY` |
| `IMP-FG-26069` | FG | MSC | `MSCU-6061844` | Ocean | -2 Days | `CLEARED` | 11,10,000 | `HEALTHY` |

---

## 6. Client-Side Chart Shaping & Factor Simulation (`app/page.js`)

### 6.1 Recharts Curve Shape Multipliers

To produce aesthetically smooth, realistic visual trend lines in Recharts components without requiring multi-megabyte time-series payloads, `app/page.js` utilizes 26-element normalized multiplier arrays:

#### Executive Dashboard (`DashboardPage`)
- `DASH_ACTUAL_SHAPE`: `[0.85, 0.92, 0.88, 0.95, 1.02, 1.08, 0.94, 0.98, 1.05, 1.12, 1.18, 1.10, 1.04, ...]`
- `DASH_PLAN_SHAPE`: `[0.90, 0.88, 0.94, 0.92, 1.05, 1.02, 1.00, 0.95, 1.10, 1.08, 1.14, 1.15, ...]`
- **Calculation**: $\text{ChartValue}_i = \text{round}(\text{BaseRevenue} \times \text{SHAPE}[i], 2)$

#### Demand Planning (`DemandPage`)
- `ACTUAL_SHAPE`: Undulating actual sell-out multiplier array.
- `FORECAST_SHAPE`: Volatile plan multiplier array crossing actuals to display forecast variance.

#### Financial Planning (`FinancialPage`)
- `REVENUE_SHAPE`: Base revenue trajectory.
- `NET_REV_SHAPE`: Net revenue trajectory incorporating scheme/logistics deductions.

---

### 6.2 Demand Factors Decomposition Engine (`DemandFactorsPage`)

Provides interactive what-if demand driver decomposition:

#### Multiplier Rules
- **Product Life Cycle (PLC)**:
  $$\text{New} = 1.20 (+20\%), \quad \text{Growth} = 1.50 (+50\%), \quad \text{Mature} = 1.00 (0\%), \quad \text{Decline} = 0.70 (-30\%)$$
- **Promotion Uplift**: $+40\%$ ($1.40$) applied on weeks `[8, 9, 15, 16, 22, 23]`.
- **Region Multipliers**:
  - `TWS Earbuds`: North = $1.15$, South = $1.05$, West = $0.95$.
  - `Smartwatches`: North = $1.05$, South = $1.10$, West = $1.00$.

#### Combined Multiplicative Formula
$$\text{AdjustedDemand}_w = \text{baseDemand} \times \text{PLC} \times \text{Seasonality}(m) \times \text{Promo}_w \times \text{Region}$$

---

### 6.3 Financial Accounts Receivable Aging Profiles

Simulates cash collection timelines across distributor distribution segments:

| Cash Segment | Terms | Current (0 DPD) | 0–30 DPD | 30–60 DPD | > 60 DPD |
|---|---|---|---|---|---|
| `direct_dealer` | Net 15 | **60%** | 25% | 10% | 5% |
| `distributor` | Net 30 | **40%** | 35% | 15% | 10% |
| `modern_trade` | Net 60 | **30%** | 40% | 20% | 10% |
| `ecommerce` | Net 7 | **85%** | 10% | 4% | 1% |

$$\text{ExpectedCollections} = \text{Revenue} \times \text{Profile}_{\text{Current}} + \text{OverdueRevenue} \times \text{Profile}_{0\text{--}30}$$

---

## 7. Verification & Audit Summary

| Component | File Path | Primary Technique Used | Determinism |
|---|---|---|---|
| **Central Dataset** | `lib/dummyData.js` | Mulberry32 Seeded PRNG (`20250701`) + Cosine Seasonality | **100% Deterministic** |
| **Inventory Policies** | `app/api/[[...path]]/route.js` | ABC Pareto + XYZ (CV) + Service Level Z-score | **Data-driven Math** |
| **Dealer Activation** | `lib/dummyData.js` | FNV-1a Stateful Hash (`stableUnit01`) | **100% Deterministic** |
| **Dispatch Fulfillment** | `lib/dummyData.js` | Supply Adequacy Ratio + Tier Nudges | **Dynamic Rule Engine** |
| **Supply Planning** | `lib/supplyChainService.js` | 3-tier Fallback (MongoDB $\rightarrow$ JSON $\rightarrow$ Code) | **Resilient Fallback** |
| **UI Charts** | `app/page.js` | Normalized 26-element Recharts shape arrays | **Visual Rendering** |
| **Demand Factors** | `app/page.js` | Multiplicative Factor Decomposition Engine | **Interactive Formula** |
| **Financial AR** | `app/page.js` | Segmented AR aging probability matrices | **Accounting Model** |
