<!-- Canonical path: docs/modules/demand-planning.md -->
<!-- Companion: docs/modules/supply-planning.md -->

# Demand Planning Module

---

## Architecture Inventory

> **Module nav id:** `demand`
> **Status:** Functional configured POC — nine Demand Planning workbenches now cover forecast overview, AI/ML visibility, NPI/lifecycle, managed events, inventory norms, role-based consensus, channel integration, listing master, and KPI close-out
> **Source:** `app/page.js` → `DemandPage` and its nine implemented sub-panels
> **API endpoints read:** `/api/data/weekly`, `/api/data/skus`, `/api/data/distributors`, `/api/data/regions`, `/api/demand/channel-integrations`, `/api/demand/listings`, `/api/demand/lifecycle`, `/api/demand/npi-forecasts`, `/api/demand/events`, `/api/demand/inventory-norms`, `/api/demand/consensus-workflows`
> **Writes:** POST/PATCH for demand events; PATCH for channel integrations, listings, lifecycle, NPI forecasts, inventory norms, and consensus workflows (server-memory persistence for the POC)
> **Last audited:** 2026-08-11

### R1 overlap decision

- **Distributor Orders does not cover Channel Partner Data Integration.** It manages primary replenishment orders from boAt to distributors; it does not ingest partner sell-through, stock, DOS, returns, or feed-health data. Demand Planning therefore implements the missing partner integration registry and health workbench while reusing the existing distributor identities.
- **Demand Factors has no calendar/event structure to extend.** It only applies a local +40% multiplier to six hardcoded week indexes. Demand Planning now owns the managed `DEMAND_EVENT` records, SKU/channel/week scope, baseline uplift overlay and post-event accuracy; the Demand Factors toggle remains an isolated what-if prototype and was not duplicated or modified.

### Forecasting, NPI, and lifecycle implementation

- **AI/ML Forecasting:** the existing Demand Planning tab is extended in place with short (0–4W), mid (5–26W), and long (27–52W) selectors. Users can view the rolled-up network or an individual channel, optionally narrow to a SKU, compare Statistical/MLRF/XGBF series, and see visible MAPE, bias, and accuracy by horizon. These are deterministic POC model outputs; production model training remains outside this suite.
- **NPI Forecasting:** API-backed NPI records expose launch week, S-curve/linear/hockey-stick profile, peak weekly units, analog product, cannibalization rate, readiness, and a recalculated 12-week projection. Mutations are validated and persist for the server process.
- **Product Lifecycle Management:** every SKU carries an editable NPI/Launch/Growth/Maturity/Decline/EOL stage. The stage assigns short-, mid-, and long-horizon methods; selecting that SKU in AI/ML Forecasting immediately changes the applied method, plotted series, and MAPE/bias calculation. POC series are provided for NPI curve, analog forecast, and ramp-down assignments as well as Statistical/MLRF/XGBF.

### 1. Sub-tab Build Status

| Sub-tab | Status | Notes |
|---|---|---|
| Forecast Overview | Functional | Live data — MAPE accuracy, sparklines, region/SKU filter, ±30% adjustment slider |
| AI/ML Forecasting | Functional (POC model outputs) | Short 0–4W, mid 5–26W and long 27–52W planning views; rolled-up or channel-level and optional SKU selection; Statistical/MLRF/XGBF comparison; visible MAPE/bias/accuracy by horizon; selected-SKU lifecycle assignment controls the applied method. Model training is not performed in this suite. |
| NPI & Lifecycle | Functional (configured POC) | Two configurable NPI launch forecasts with editable launch week, S-curve/linear/hockey-stick profile, analog selection, peak units, cannibalization and readiness; lifecycle stages are editable and immediately change forecast-method assignments. |
| Event & Promotion Calendar | Functional (configured POC) | API-backed event creation and updates with type, week range, SKU/channel scope, uplift %, lifecycle status, baseline-vs-adjusted overlay and post-event uplift accuracy. |
| Channel Inventory Norms | Functional (configured POC) | Suggested DOS derives from demand CV, partner-tier lead time and 97.5% service target; actual DOS is compared with min/max bands and planner overrides become the effective norm. |
| Consensus Workflow | Functional (configured POC) | Category Manager → Sales Head → S&OP Lead → Finance role enforcement; Finance locks the final number; every override, approval, rejection and lock appends an actor/reason/value/timestamp audit record. |
| Channel Partner Data Integration | Functional (configured POC) | Reuses the distributor/channel-partner master and adds API-backed eight-type channel taxonomy, source protocol, sell-through/stock/DOS/returns availability, feed cadence, record count, last sync, manual receipt acknowledgement, freshness health and gap flags |
| Product/Partner Listing Master | Functional (configured POC) | API-backed SKU × Partner records with status, effective/de-listing dates, region availability, MOQ and exclusivity; matrix status and detail dialog are editable |
| KPI Dashboard | Functional | Final scorecard for forecast MAPE/bias, consensus compliance, norm adherence, NPI readiness, event uplift accuracy and channel feed freshness. |

### 2. Data Entities Read

| Endpoint | Fields used | Where shown |
|---|---|---|
| `/api/data/weekly` | `weekId`, `weekLabel`, `region`, `skuId`, `skuName`, `category`, `tertiary` (actual), `secondary` (forecast) | Weekly chart, SKU detail table, sparklines |
| `/api/data/skus` | `id`, `name`, `category` | Filter dropdowns |
| `/api/data/distributors` | `id`, `name`, `region`, `tier` | Channel integration panel + listing matrix |
| `/api/data/regions` | `id`, `name` | Region filter dropdown |
| `/api/demand/channel-integrations` | `channelType`, `sourceType`, `expectedCadenceHours`, `dataDomains`, `lastSyncAt`, `freshnessHours`, `recordCount`, `healthStatus`, `gapFlag` | Channel Partner Data Integration registry and health matrix; PATCH also supports `action=mark_received` to acknowledge a new feed |
| `/api/demand/listings` | `listingId`, `skuId`, `distributorId`, `status`, `effectiveDate`, `delistingDate`, `region`, `moq`, `exclusivity`, audit fields | Product/Partner Listing Master matrix and listing detail dialog |
| `/api/demand/lifecycle` | `skuId`, `stage`, `stageSince`, `forecastMethods.short/mid/long`, audit fields | Lifecycle management table and method assignment panels |
| `/api/demand/npi-forecasts` | `npiId`, `launchWeek`, `curveTemplate`, `peakWeeklyUnits`, `analogSkuId`, `cannibalizationRatePct`, `readinessPct`, `projection[]` | NPI forecast cards and 12-week launch curves |
| `/api/demand/events` | `eventId`, type, start/end week, affected SKUs/channels, planned/actual uplift, status, audit fields | Managed calendar, baseline uplift overlay and post-event accuracy |
| `/api/demand/inventory-norms` | suggested/override/effective/actual DOS, min/max, CV, lead time, service target, override reason and audit fields | Channel inventory norm scorecard and editable norm grid |
| `/api/demand/consensus-workflows` | role owner, statistical/channel/proposed/final forecasts, status and `auditTrail[]` | Role queue, overrides, approvals/rejections, lock and audit history |

### 3. Key UI Components

| Widget | Description |
|---|---|
| 9-tab `<Tabs>` | Forecast Overview / AI/ML / NPI & Lifecycle / Events / Inventory Norms / Consensus / Channel Integration / Listing Master / KPI Dashboard |
| 4× `KpiCard` | Total Demand, Total Forecast, Forecast Accuracy (MAPE %), Growth Trend |
| `Slider` | Forecast adjustment −30% to +30% — affects adjusted column and chart |
| `LineChart` | Actual vs Forecast (+ Adjusted) — 26 weeks, shaped by `ACTUAL_SHAPE` / `FORECAST_SHAPE` multiplier arrays applied to live data |
| SKU detail `DataTable` | Per-SKU: actual, forecast, adjusted, inline sparkline, MAPE accuracy bar, growth % |
| `ChannelPartnerIntegrationPanel` | Editable eight-type channel classification, feed protocol, data-domain coverage (including returns), cadence SLA, last sync/receipt acknowledgement, record count, health and actionable gap flag per partner |
| `ListingMasterPanel` | SKU × Distributor matrix with four listing statuses plus a detail dialog for dates, region, MOQ and exclusivity |
| `ForecastIntelligencePanel` | Horizon, channel, and SKU selectors; MAPE/bias widgets; all-horizon accuracy table; Statistical/MLRF/XGBF comparison chart; lifecycle-selected applied method and assignment table |
| `NpiLifecyclePanel` | NPI launch-curve cards with editable launch timing, curve, analog, volume, cannibalization, and readiness assumptions plus lifecycle stage management and short/mid/long method tags |
| `EventCalendarPanel` | Managed event table and editor plus SKU/channel-scoped uplift overlay on the baseline forecast and post-event accuracy |
| `InventoryNormsPanel` | Suggested/effective/actual DOS comparison, channel filter, override editor, adherence and exception KPIs |
| `DemandConsensusPanel` | Acting-role selector, ordered approval queue, required override/rejection reasons and consolidated audit trail |
| `DemandPlanningKpiDashboard` | Closing executive scorecard and percentage health chart across six core demand-planning KPIs |

### 4. Overlap with Other Modules

| Module | Relationship |
|---|---|
| **Distributor Orders** | Reuses the same `distributors[]` identities but does **not** cover partner data integration. It owns replenishment order placement, freeze governance and dealer activation; Demand Planning owns inbound sell-through/stock/DOS feed configuration and health. |
| **Supply Planning → Cockpit** | Demand Planning uses `secondary` (secondary forecast). The Cockpit uses `demandVsSupplyTrend[]` from `/api/v1/supply-planning`. Two separate data sources, no shared state. |
| **Financial Planning** | `tertiary` (actual sell-out units) feeds both MAPE calculations here and revenue computations there. |
| **Demand Factors** | Retains its isolated +40% hardcoded promotion what-if toggle. It has no calendar/entity structure. Demand Planning owns managed events and governed forecast overlays; a future integration may make Demand Factors consume these records. |
| **Chatbot** | Both read `weekly[]` independently. Chatbot computes demand_spike / demand_growth insights from the same source. |

### 5. Overlap with boAT Requirement — "Continuous Demand vs Supply View"

"Order vs Dispatch" (see `order-vs-dispatch.md`) provides the supply execution side of this view (ordered vs dispatched gap). This tab provides the demand side (actual vs forecast). Together they partially address the "Continuous Demand vs Supply View" boAT requirement, but there is no unified view that combines both into a single rolling demand-vs-supply panel.

---

## Design Contract (S&OP Suite Extension)

# Demand Planning â€” S&OP Suite Extension Design

> **Document type:** Design contract with current implementation status noted below.
> **Relationship:** This is the design for the **Demand Planning tab** inside the S&OP Suite (`/supply-planning/demand-planning`). It deliberately avoids duplicating anything already handled by the **separate VANCO S&OP Forecasting system**.
> **References:** `docs/DATA_MODEL.md` Â· `docs/GAPS.md`

---

## 1. Existing System Boundary (What Not to Rebuild)

The following capabilities are **fully operational in the standalone VANCO S&OP Forecasting module** (evidenced from screenshots). The S&OP Suite must consume outputs from this system â€” not recreate them.

| Capability | What the Existing Module Does |
|---|---|
| **Statistical Forecasting Engine** | Produces four model outputs per SKU Ã— week: Statistical baseline, MLRF (Random Forest), XGBF (XGBoost), and Consensus |
| **Forecast Accuracy Tracking** | Weekly Acc vs Stat, Acc vs Cons, Acc vs MLRF, Acc vs XGBF vs Actuals per SKU â€” with color-coded accuracy bands |
| **Three-Tier Volume Hierarchy** | Tertiary VOL (retail sell-out), Secondary VOL (distributor sell-in), Primary VOL (factory dispatch) maintained and displayed |
| **Time-phased Forecast View** | Monthly + weekly granularity; overlays Last Yr. Actuals, Past Actuals, Past Forecast, Projected signals |
| **Channel Stock Positions** | DBR Stock (distributor), Retailer Stock, Market Stock, Closing stock, Market DOS â€” at product-week level |
| **Basic Consensus Tab** | A Consensus column exists for planners to override the statistical number, but no formal signoff workflow |
| **Forecast Drivers** | A collapsed "Drivers" section exists at product level (likely event/promo uplift inputs at the granular level) |
| **Product Hierarchy Navigation** | Family â†’ SKU sidebar with budget series grouping |

> **Integration assumption:** The S&OP Suite calls the existing module's API (or shared DB) to read `STATISTICAL`, `MLRF`, `XGBF` forecast outputs and `ACTUALS`. It does **not** re-run these models.

---

## 2. What the S&OP Suite Demand Planning Tab Adds

The 9 stated requirements are mapped below. Each is classified as:
- **Extend** â€” existing module has a partial foundation; the S&OP Suite adds the governance/integration/visibility layer
- **New** â€” entirely absent from the existing module

### Requirement Mapping

| # | Requirement | Classification | S&OP Suite Scope (what we add) |
|---|---|---|---|
| 1 | Channel Partner Data Integration | **Implemented POC extension** | Reuses the existing distributor identities as the partner master and now provides the full eight-type channel taxonomy, API/webhook/EDI-SFTP/portal/internal/manual protocols, per-partner sell-through/stock/DOS/returns availability, cadence SLA, feed receipt acknowledgement, last-sync freshness, record counts and gap flags. Real external connector execution remains an integration gap. |
| 2 | AI/ML Forecasting â€” Long/Mid/Short Term, channel-level | **Implemented POC extension** | The suite exposes Statistical, MLRF and XGBF output comparisons without re-running training. Short 0â€“4W, mid 5â€“26W and long 27â€“52W views support rolled-up network or individual partner channels, with visible MAPE, bias and accuracy backtests by horizon. Production integration must replace the deterministic POC outputs with forecasting-engine outputs. |
| 3 | NPI Forecasting | **Implemented POC extension** | Configurable NPI launch records support S-curve, linear and hockey-stick projections, analog SKU selection, peak weekly volume, cannibalization rate and readiness tracking. The current POC seeds two launch records and persists changes for the server process. |
| 4 | Product Lifecycle Management | **Implemented POC extension** | Editable NPI / Launch / Growth / Maturity / Decline / EOL tags now assign short, mid and long forecast methods. Stage changes immediately update method tags in both the lifecycle workbench and AI/ML forecasting view. Durable master-data persistence and automatic stage-transition rules remain production gaps. |
| 5 | Event / Promotion Calendar Engine | **Implemented POC extension** | Demand Factors has only hardcoded promotion indexes, not a calendar to extend. `DEMAND_EVENT` records now govern event type, week range, optional SKU/channel scope, planned uplift, status and actual uplift. The UI overlays event-adjusted demand on the live baseline and reports post-event accuracy. |
| 6 | System-suggested Channel Inventory Norms | **Implemented POC** | Suggested DOS per SKU × channel is computed from observed demand CV, partner-tier lead time and a 97.5% service target. The grid compares actual, suggested and effective DOS; validated planner overrides store a reason and owner. |
| 7 | Role-based Demand Consensus Workflow | **Implemented POC extension** | The existing basic consensus number now enters a Category Manager → Sales Head → S&OP Lead → Finance state machine. Actions are role-gated, rejection returns the item to Category review, Finance approval locks it, and every override/action records actor, role, reason, old/new value and timestamp. |
| 8 | Dashboards on Demand Planning KPIs | **Implemented POC extension** | The closing KPI Dashboard reports Forecast MAPE and Bias, Consensus Compliance, Inventory Norm Adherence, NPI Readiness, Event Uplift Accuracy and Channel Data Freshness, with a comparable percentage scorecard. |
| 9 | Product / Partner Listing Master Management | **Implemented POC extension** | `LISTING_MASTER` now provides API-backed SKU × partner records with effective date, de-listing date, region availability, listing status, MOQ, exclusivity and audit fields. A delisted SKU/partner combination is visibly blocked in the matrix. Durable database persistence remains a production-hardening step. |

---

### 2.1 Channel Partner Data Integration â€” Full Design

This is the most foundational of all 9 requirements. Without the channel partner master and its integration layer, channel-level forecasting (Req 2), channel inventory norms (Req 6), and the listing master (Req 9) have no reference anchor.

#### Channel Type Taxonomy (8 types)

| Channel Type | Description | boAT Partner Examples |
|---|---|---|
| **ONLINE_MARKETPLACE** | Pure-play e-commerce platforms; high volume, high return rate | Amazon India, Flipkart, Meesho, Myntra, Ajio, Nykaa Fashion |
| **MODERN_TRADE_ONLINE** | Omnichannel retailers with a significant **online / app storefront** | Croma (croma.com), Reliance Digital (reliancedigital.in), Vijay Sales Online, iStore Online, Samsung SmartCafÃ© Online |
| **MODERN_TRADE_OFFLINE** | Same physical-chain retailers â€” the **store / POS channel** tracked separately from online | Croma Stores, Reliance Digital Stores, Vijay Sales Stores, Sangeetha, Big C Mobiles |
| **QUICK_COMMERCE** | On-demand 10â€“30 min delivery platforms; near-real-time sell-through and dark store inventory | Blinkit (Zomato), Zepto, Swiggy Instamart, BigBasket Now |
| **D2C** | boAT's own direct-to-consumer online channel | boat-lifestyle.com, boAT App |
| **GENERAL_TRADE** | Traditional offline distributor â†’ sub-distributor â†’ retailer network | Regional super-stockists, C&F agents, state distributors, kirana trade |
| **EXPORT** | International distributors and cross-border e-commerce | Middle East, SEA, Global Amazon, international distributors |
| **B2B** | Corporate / institutional bulk orders | Enterprise gifting companies, telecom bundle agreements |

> **Multi-format partners (e.g. Croma, Reliance Digital):** These partners get **two channel codes** â€” one for their online storefront (`MODERN_TRADE_ONLINE`) and one for their physical stores (`MODERN_TRADE_OFFLINE`), e.g. `CH-CROMA-ONL` and `CH-CROMA-OFF`. Both share `parentGroupCode = GRP-CROMA`, enabling a **consolidated Croma view** (total sell-through, combined DOS) in the cockpit while keeping integration methods, data freshness cadence, stock location type, and inventory norms separately configured per format.

#### Integration Method & Data Availability Matrix

| Channel Type | Integration Method | Data Freshness | Sell-Through (Tertiary) | Channel Stock / DOS | Returns | Stock Location |
|---|---|---|---|---|---|---|
| ONLINE_MARKETPLACE | `API_PULL` via Seller Central / Brand Portal | Daily | Yes | FC inventory | Yes | `FULFILLMENT_CENTER` |
| MODERN_TRADE_ONLINE | `BRAND_PORTAL_EXPORT` or `EDI_SFTP` | Daily | Yes (online orders) | Online warehouse / dark store | Partial | `FULFILLMENT_CENTER` or `DARK_STORE` |
| MODERN_TRADE_OFFLINE | `EDI_SFTP` â€” retailer POS extract | Weekly | Yes (POS sell-out) | Store shelf + back-room | No | `RETAIL_STORE` |
| QUICK_COMMERCE | `WEBHOOK` or `API_PULL` hourly | Hourly / Real-time | Yes | Dark store inventory (near real-time) | Partial | `DARK_STORE` |
| D2C | Internal API (boAT platform) | Real-time | Yes | Own warehouse via Inventory Position | Yes | `FULFILLMENT_CENTER` |
| GENERAL_TRADE | `MANUAL_UPLOAD` or distributor DMS `EDI_SFTP` | Weekly / Monthly | Secondary sales only | Distributor warehouse | No | `DISTRIBUTOR_WAREHOUSE` |
| EXPORT | `MANUAL_UPLOAD` | Monthly | Yes (partner-submitted) | Partner warehouse | No | `DISTRIBUTOR_WAREHOUSE` |
| B2B | Manual (order confirmation) | On demand | No (order-based only) | N/A | No | N/A |

#### Integration Health Panel (Sub-tab 5: Channel & Listings)

Per active channel record, the UI surfaces a health card:

| Signal | Source field | Good / Warning / Critical logic |
|---|---|---|
| Last Sync Status | `lastSyncStatus` | GREEN = SUCCESS / AMBER = PARTIAL / RED = FAILED or NEVER |
| Data Age vs SLA | `lastSyncAt` vs `dataFreshnessCadence` | Within cadence / approaching 2Ã— cadence / past 2Ã— cadence |
| Sell-Through Gap | Expected weeks received vs actual | No gap / 1â€“2 week gap / >2 week gap |
| Channel Stock Data | `inventoryDataAvailable` + snapshot age | Available & fresh / Stale / Not configured |
| Forecast Submission | `forecastSubmissionLeadDays` vs actual | On time / Late / Not received |
| Listing Coverage | % of active SKUs with ACTIVE listing status | >90% / 70â€“90% / <70% |

> Channels where `lastSyncStatus = FAILED` or data age exceeds 2Ã— `dataFreshnessCadence` auto-generate a **Constraints & Risks exception** (`DATA_FEED_FAILURE`, Tier 1).

#### What Each Channel Data Signal Feeds Downstream

| Channel Data Signal | Populates Entity | Consumed By |
|---|---|---|
| Sell-through (Tertiary VOL) | `Forecast` (forecastType = ACTUALS) | Demand Planning, Supply Workspace, Overview Cockpit |
| Channel stock / DOS | `Inventory Position` (locationType = CHANNEL_STOCK) | Inventory Planning, Demand Planning norm comparison |
| Returns / cancellations | `Forecast` (negative actuals adjustment) | Demand Planning |
| Distributor secondary sales | `Forecast` (forecastType = ACTUALS, tier = SECONDARY) | Demand Planning |
| Channel-submitted demand | `DEMAND_CONSENSUS_WORKFLOW.channelSubmittedFcst` | Demand Planning â€” Consensus Workflow sub-tab |

---

## 3. Net-New Data Entities for the Demand Planning Tab

These entities do not exist in either the current S&OP Suite codebase or the existing VANCO module. They must be added to `DATA_MODEL.md`.

---

### 3.1 PLM_STAGE (Product Lifecycle Stage)

**Purpose:** Tags each SKU with its current lifecycle stage, driving forecast model selection, norm multipliers, and demand plan shape.

| Field | Type | Description |
|-------|------|-------------|
| `plmId` | string (PK) | UUID |
| `skuCode` | FK â†’ SKU_MASTER | |
| `stage` | enum | `NPI` Â· `LAUNCH` Â· `GROWTH` Â· `MATURITY` Â· `DECLINE` Â· `EOL` |
| `stageStartDate` | date | When this stage became effective |
| `stageEndDate` | date | Expected end of stage (nullable if current) |
| `recommendedForecastModel` | enum | `NPI_CURVE` Â· `STATISTICAL` Â· `MLRF` Â· `XGBF` Â· `CONSENSUS` |
| `safetyStockMultiplier` | number | Multiplier applied on top of baseline safety stock norm (e.g. 1.5x at Launch) |
| `demandRampProfile` | enum | `S_CURVE` Â· `LINEAR` Â· `HOCKEY_STICK` Â· `FLAT` Â· `RAMP_DOWN` |
| `cannibalisedSkus` | FK[] â†’ SKU_MASTER | SKUs expected to lose volume to this NPI |
| `cannibalisation Rate` | number | Estimated % volume transfer from each cannibalized SKU |
| `eolClearancePlan` | string | Free text EOL clearance / write-off plan |
| `setByUserId` | FK â†’ USER | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

**Read/Write by tab:**

| Tab | Access | Notes |
|-----|--------|-------|
| Demand Planning | R, W | Primary home â€” set and update lifecycle stage per SKU |
| Overview Cockpit | R | NPI Readiness % KPI |
| Supply Workspace | R | Drives NPI capacity reservation flag in MRP |
| Inventory Planning | R | safetyStockMultiplier applied to norm calculation |
| Scenario Studio | R | EOL SKUs excluded from long-range scenarios |

---

### 3.2 DEMAND_EVENT (Promotion / Event Calendar)

**Purpose:** Structured record of every event (festival, promotion, trade campaign, media burst) that creates a demand uplift over the statistical baseline. The event calendar is the governance layer over the existing module's per-product Drivers inputs.

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string (PK) | UUID |
| `eventName` | string | e.g. "Diwali 2026 Promotion", "Amazon Prime Day" |
| `eventType` | enum | `FESTIVAL` Â· `PROMOTIONAL` Â· `TRADE_CAMPAIGN` Â· `MEDIA_BURST` Â· `SPORTS_ANCHOR` Â· `CLEARANCE` |
| `startWeek` | string | ISO week of event start e.g. `2026-W43` |
| `endWeek` | string | ISO week of event end |
| `affectedSkus` | FK[] â†’ SKU_MASTER | SKUs impacted (empty = applies to all) |
| `affectedChannels` | FK[] â†’ CHANNEL_PARTNER_MASTER | Channels where uplift applies |
| `upliftMethod` | enum | `ADDITIVE` Â· `MULTIPLICATIVE` |
| `upliftPercent` | number | e.g. 25 = +25% over statistical baseline |
| `upliftUnits` | number | Optional absolute unit uplift override |
| `actualUpliftPercent` | number | Filled post-event from actuals vs pre-event baseline |
| `upliftAccuracy` | number | Computed: |actualUpliftPercent âˆ’ upliftPercent| |
| `status` | enum | `PLANNED` Â· `ACTIVE` Â· `COMPLETED` Â· `CANCELLED` |
| `createdByUserId` | FK â†’ USER | |
| `approvedByUserId` | FK â†’ USER | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

**Read/Write by tab:**

| Tab | Access | Notes |
|-----|--------|-------|
| Demand Planning | R, W | Primary home â€” full CRUD for event calendar |
| Overview Cockpit | R | Upcoming events banner on cockpit |
| Supply Workspace | R | Event uplift adds to grossDemand in affected weeks |
| Scenario Studio | R, W | Scenario A / B can toggle events on/off as levers |
| Constraints & Risks | R | Events with upliftPercent > 30% auto-flag as supply risk |

---

### 3.3 CHANNEL_INVENTORY_NORM (AI-Suggested DOS Target)

**Purpose:** System-recommended Days of Supply target per SKU Ã— channel, computed from demand variability, lead time, and service level policy. This is what the Inventory Planning tab uses to set safety stock; the Demand Planning tab is where the norm is reviewed and overridden at the channel level.

| Field | Type | Description |
|-------|------|-------------|
| `normId` | string (PK) | UUID |
| `skuCode` | FK â†’ SKU_MASTER | |
| `channelCode` | FK â†’ CHANNEL_PARTNER_MASTER | |
| `effectiveWeek` | string | ISO week from which this norm applies |
| `targetDosDays` | number | System-recommended Days of Supply target |
| `minDosDays` | number | Hard floor (below this = stockout risk) |
| `maxDosDays` | number | Hard ceiling (above this = overstock) |
| `currentDosDays` | number | Actual DOS from Inventory Position |
| `normStatus` | enum | `HEALTHY` Â· `LOW` Â· `CRITICAL` Â· `OVERSTOCK` |
| `computedFromCv` | number | Coefficient of variation of demand used in computation |
| `computedFromLeadTime` | number | Lead time used in computation (days) |
| `targetServiceLevel` | number | Service level % this norm is calibrated to (e.g. 97.5) |
| `overrideByUserId` | FK â†’ USER | Set if planner manually overrode the system suggestion |
| `overrideValue` | number | Planner's override DOS value |
| `overrideReason` | string | |
| `computedAt` | datetime | When the AI engine last ran |

**Read/Write by tab:**

| Tab | Access | Notes |
|-----|--------|-------|
| Demand Planning | R, W | Primary home â€” review system norms, apply overrides |
| Inventory Planning | R, W | Norms drive safetyStockQty calculation in Inventory Position |
| Overview Cockpit | R | Inventory Norm Adherence % KPI |
| Constraints & Risks | R | normStatus = CRITICAL auto-generates a supply constraint exception |
| Network & Transfers | R | Norm gaps between DCs trigger inter-DC transfer suggestions |

---

### 3.4 LISTING_MASTER (SKU Ã— Channel Listing)

**Purpose:** Defines which SKUs are listed (available for sale) with which channel partners, and the effective dates of each listing. A delisted SKU cannot carry an active channel forecast â€” this entity gates forecast eligibility and is the reference for Channel Partner Data Integration.

| Field | Type | Description |
|-------|------|-------------|
| `listingId` | string (PK) | UUID |
| `skuCode` | FK â†’ SKU_MASTER | |
| `channelCode` | FK â†’ CHANNEL_PARTNER_MASTER | |
| `region` | string | Region within the channel (e.g. "South India") |
| `listingStatus` | enum | `ACTIVE` Â· `PENDING_ACTIVATION` Â· `SUSPENDED` Â· `DELISTED` |
| `listingDate` | date | Date this SKU went live with this channel |
| `delistingDate` | date | Date this SKU was removed (nullable) |
| `exclusiveFlag` | boolean | True if this SKU is exclusive to this channel in this region |
| `targetMrp` | number | Channel-specific MRP (INR) |
| `channelMargin` | number | Channel margin % |
| `minOrderQty` | number | Channel's minimum order quantity |
| `activatedByUserId` | FK â†’ USER | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

**Read/Write by tab:**

| Tab | Access | Notes |
|-----|--------|-------|
| Demand Planning | R, W | Primary home â€” manage listing records; gates which channel forecasts are valid |
| Overview Cockpit | R | Active listings count per channel in KPI cards |
| Procurement POs | R | Channel exclusivity flag can gate which PO allocations go to which channel |
| Scenario Studio | R | New channel listing activations can be a scenario lever (e.g. "list on 2 new e-comm channels") |

---

### 3.5 Demand Consensus Subject (shared workflow reference)

The Demand-owned `demand_consensus_workflows` record stores the forecast values being governed and carries `workflowId` as a foreign key. It does **not** own steps or an embedded audit log. Both Demand consensus and Production sign-off use the canonical shared schema in [DATA_MODEL_MASTER.md](../data/DATA_MODEL_MASTER.md#factor-proposals-consensus-and-official-plan):

- `workflow_instances` stores state, current step, due date, and lock metadata. Demand uses `workflowType = DEMAND_CONSENSUS`, `subjectType = DEMAND_FORECAST`, and `subjectId = skuId`.
- `workflow_steps` stores the ordered Category Manager, Sales Head, S&OP Lead, and Finance assignments at grain `workflowId × stepSequence`.
- `entity_audit_events` is the only append-only action history. Overrides, approvals, rejections, and locks write the same collection and fields used by Production sign-off.

The API may project `auditTrail[]` and `workflowSteps[]` for the existing screen. Those are response views assembled from the shared collections, not separately persisted Demand schemas. The step table below is a Demand-specific view of `workflow_steps`, not a `DEMAND_CONSENSUS_STEP` collection.

**Purpose:** Structured 4-step demand signoff chain that formalizes the Consensus tab from the existing module into a proper state machine with named approvers, comments, lock, and escalation. The existing module's Consensus column becomes the *input* to this workflow; the workflow output is a locked `forecastType = CONSENSUS` row in the Forecast entity.

| Field | Type | Description |
|-------|------|-------------|
| `workflowId` | string (PK) | UUID |
| `skuCode` | FK â†’ SKU_MASTER | |
| `channelCode` | FK â†’ CHANNEL_PARTNER_MASTER | Null = total-level consensus |
| `planningWeek` | string | ISO week being consensed |
| `horizonType` | enum | `SHORT` Â· `MID` Â· `LONG` |
| `statisticalFcst` | number | Input: Statistical model output (from existing module) |
| `mlrfFcst` | number | Input: MLRF model output (from existing module) |
| `xgbfFcst` | number | Input: XGBF model output (from existing module) |
| `channelSubmittedFcst` | number | Input: Channel's own demand submission |
| `proposedConsensusFcst` | number | Demand planner's proposed number |
| `finalConsensusFcst` | number | Agreed number after all steps complete |
| `overrideReason` | string | Why proposedConsensusFcst differs from statistical |
| `overridePercent` | number | Computed: (proposedConsensusFcst âˆ’ statisticalFcst) Ã· statisticalFcst Ã— 100 |
| `workflowStatus` | enum | `DRAFT` Â· `CATEGORY_REVIEW` Â· `SALES_REVIEW` Â· `SOP_REVIEW` Â· `FINANCE_REVIEW` Â· `LOCKED` Â· `REJECTED` |
| `currentStepOwner` | FK â†’ USER | Who has it right now |
| `lockedAt` | datetime | When status moved to LOCKED |
| `lockedByUserId` | FK â†’ USER | |

#### 3.5a Demand projection of shared workflow rows

| Field | Type | Description |
|-------|------|-------------|
| `workflowId` | FK → `workflow_instances` | Same identifier stored on the Demand subject |
| `stepSequence` | number | 1 = Category, 2 = Sales, 3 = S&OP, 4 = Finance |
| `stepCode` | enum | `CATEGORY_REVIEW` · `SALES_REVIEW` · `SOP_REVIEW` · `FINANCE_REVIEW` |
| `assignedRole` | string | Role responsible for this step |
| `assignedUserId` | FK → USER | |
| `status` | enum | `PENDING` · `IN_PROGRESS` · `COMPLETED` |
| `decision` | enum/null | `APPROVED` · `REJECTED` · null |
| `comment` | string | Step decision comment |
| `actedAt` | datetime | |

**Read/Write by tab:**

| Tab | Access | Notes |
|-----|--------|-------|
| Demand Planning | R, W | Primary home â€” create, advance, approve, reject workflow |
| Overview Cockpit | R | Consensus Compliance % KPI (% of weeks with LOCKED status on time) |
| Scenario Studio | R | Reads LOCKED consensus as the baseline for S&OP scenario comparison |

When a built scenario is published, Forecast Overview also reads the single active `scenario_versions.status=PUBLISHED` reference and its canonical `scenario_output_lines`. It resolves `scenarioDemandQty` at SKU × channel × week ahead of the baseline display and labels the selected scenario. Locked consensus remains the immutable `baselinePlanVersionId`; publication does not overwrite forecast vintages or consensus workflow history.
| Supply Workspace | R | finalConsensusFcst â†’ grossDemand once workflow is LOCKED |

---

## 4. Sub-Tab Design for the Demand Planning Tab

The current S&OP Suite Demand Planning module has **nine implemented sub-tabs**. Forecast intelligence and master-data workbenches are joined by managed events, inventory norms, role-based consensus, and a closing KPI dashboard. Demand Factors remains a separate what-if visualization and does not own managed event records.

```
Demand Planning Tab
â”œâ”€â”€ 1. Forecast Overview       â† Reads outputs from existing module; model comparison, KPI summary
â”œâ”€â”€ 2. Consensus Workflow      â† DEMAND_CONSENSUS_WORKFLOW state machine; 4-step signoff
â”œâ”€â”€ 3. NPI & Lifecycle         â† PLM_STAGE CRUD; NPI launch curve configuration
â”œâ”€â”€ 4. Event Calendar          â† DEMAND_EVENT calendar view + uplift entry
â””â”€â”€ 5. Channel & Listings      â† CHANNEL_PARTNER_MASTER + LISTING_MASTER management;
                                  channel inventory norms (CHANNEL_INVENTORY_NORM)
```

### Sub-tab 1: Forecast Overview

**Primary user:** S&OP Lead, Demand Planner
**Data read:** Forecast (from existing module via API), DEMAND_CONSENSUS_WORKFLOW (current status), PLM_STAGE, DEMAND_EVENT (upcoming events)

**UI components:**
- KPI strip: MAPE (by model, rolling 13W), Forecast Bias %, Consensus Compliance %, Channel Freshness %
- Horizon selector toggle: SHORT / MID / LONG (each shows different model recommendation)
- SKU Ã— channel filter (inherits Channel Partner Master)
- Model comparison table: Statistical | MLRF | XGBF | Consensus | Actuals per week â€” pulled from existing module
- Event overlay toggle: shows DEMAND_EVENT uplifts as shaded bands on the week columns
- Lifecycle stage badge per SKU row
- Deep-link to Consensus Workflow for any row where workflow is not LOCKED

### Sub-tab 2: Consensus Workflow

**Primary user:** Category Manager, Sales Head, S&OP Lead, Finance (each sees their step)
**Data written:** Demand subject + shared `workflow_instances`, `workflow_steps`, and `entity_audit_events`

**UI components:**
- Workflow queue: list of SKU Ã— week rows awaiting the current user's action
- Step progress indicator (Category â†’ Sales â†’ S&OP â†’ Finance â†’ Locked)
- Side-by-side comparison: Statistical | MLRF | XGBF | Channel Submitted | Proposed Consensus
- Override % variance badge (amber if >10% over statistical, red if >20%)
- Approve / Reject / Adjust + comment panel
- Locked rows display finalConsensusFcst with lock icon and timestamp
- Bulk approve for routine weeks (filter by overridePercent < 5%)

### Sub-tab 3: NPI & Lifecycle

**Primary user:** NPI Manager, Category Manager
**Data written:** PLM_STAGE (stage, model, ramp profile, cannibalization map)

**UI components:**
- Product lifecycle kanban: columns = NPI â†’ Launch â†’ Growth â†’ Maturity â†’ Decline â†’ EOL
- Each SKU card shows: current stage, stage duration, recommended model, safetyStockMultiplier
- NPI detail drawer: launch curve selector (S-curve / linear / hockey-stick), target launch week, cannibalization SKU picker, cannibalization rate %
- Cannibalization impact preview: shows projected demand lift vs loss on affected SKUs
- NPI Readiness checklist: BOM complete, ODM confirmed, import plan active, listing live (reads from Materials & BOM, ODM & EMS Master, Import Tracking, Listing Master)

### Sub-tab 4: Event Calendar

**Primary user:** Category Manager, Sales Head
**Data written:** DEMAND_EVENT

**UI components:**
- Monthly calendar view with event bands by week range + channel/SKU filter
- Event creation drawer: event type, date range, affected channels, affected SKUs, uplift method, uplift %
- Uplift preview: side-by-side base forecast vs event-adjusted forecast for affected weeks
- Post-event accuracy row: actual uplift vs planned uplift, accuracy % (computed post-event)
- Event library: reusable templates for recurring festivals (Diwali, Big Billion Day, etc.)

### Sub-tab 5: Channel & Listings

**Primary user:** Sales Operations, S&OP Lead
**Data written:** CHANNEL_PARTNER_MASTER, LISTING_MASTER, CHANNEL_INVENTORY_NORM (overrides)

**UI components:**
- Channel partner registry table: channel name, type, region, integration status (data freshness badge), forecastSubmissionLeadDays
- Listing matrix: SKU rows Ã— channel columns, color-coded by listingStatus
- Listing record drawer: activate/suspend/delist, MRP, margin, MOQ, exclusivity flag
- Channel inventory norm table: SKU Ã— channel, system-suggested DOS, actual DOS, status badge, planner override field
- Integration health panel: last sync time per channel, record count, gap flags

---

## 5. Integration Handshake with the Existing VANCO Module

| Data Direction | What Flows | Mechanism |
|---|---|---|
| Existing Module â†’ S&OP Suite | `STATISTICAL`, `MLRF`, `XGBF` forecast outputs per SKU Ã— channel Ã— week | API pull (action: `forecast_list?forecastType=STATISTICAL,MLRF,XGBF`) |
| Existing Module â†’ S&OP Suite | Forecast Accuracy records (Acc vs Stat, Acc vs MLRF, Acc vs XGBF) | API pull (action: `forecast_accuracy`) |
| Existing Module â†’ S&OP Suite | Actuals (Tertiary/Secondary/Primary volumes + stock positions) | API pull (action: `actuals_list`) |
| S&OP Suite â†’ Existing Module | `CONSENSUS` forecast (finalConsensusFcst from LOCKED workflow) | API push â€” the locked consensus overwrites the Consensus column in the existing module |
| S&OP Suite â†’ Existing Module | Event uplifts (DEMAND_EVENT â†’ Drivers section in existing module) | API push on event creation/update |

> **Principle:** The existing module owns the ML engine and granular time-series data entry. The S&OP Suite owns governance (consensus workflow, lifecycle staging, event calendar governance, listing master) and aggregated decision-making. Neither duplicates the other's primary responsibility.

---

## 6. Updated API Actions for Demand Planning Entities

### Current POC routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/demand/channel-integrations` | GET, PATCH | Partner feed configuration, validated taxonomy/domains, health, and `mark_received` freshness acknowledgement |
| `/api/demand/listings` | GET, PATCH | Product/partner listing master management |
| `/api/demand/lifecycle` | GET, PATCH | Lifecycle stage and stage-derived horizon methods |
| `/api/demand/npi-forecasts` | GET, PATCH | Validated NPI timing/curve/analog/volume/cannibalization/readiness assumptions and recalculated 12-week launch projections |
| `/api/demand/events` | GET, POST, PATCH | Managed event creation/update, scoped uplift assumptions, lifecycle status and post-event actual uplift |
| `/api/demand/inventory-norms` | GET, PATCH | CV/lead-time/service-level suggested DOS plus validated planner overrides |
| `/api/demand/consensus-workflows` | GET, PATCH | Role-gated override/approve/reject/lock state machine with append-only POC audit trail |

The master mutations above persist in server memory for the POC and reset when the application process restarts.

Extends the `/api/v1/supply-planning?action=` convention from `DATA_MODEL.md`:

| Entity | Actions |
|--------|---------|
| PLM Stage | `plm_list` Â· `plm_set_stage` Â· `plm_history` |
| Demand Event | `event_list` Â· `event_create` Â· `event_update` Â· `event_cancel` Â· `event_post_actuals` |
| Channel Inventory Norm | `norm_list` Â· `norm_compute` Â· `norm_override` |
| Listing Master | `listing_list` Â· `listing_create` Â· `listing_update_status` |
| Demand Consensus Workflow | `consensus_workflow_list` Â· `consensus_submit` Â· `consensus_approve` Â· `consensus_reject` Â· `consensus_lock` |
| Forecast (from existing module) | `forecast_pull_statistical` Â· `forecast_pull_accuracy` Â· `forecast_push_consensus` |

