# Data Model Master

Status: implementation gate passed. Every entity in the registry below is `DB-verified` against the configured MongoDB database using generated natural keys and the integrity checks in `scripts/verify_data_model_master.js`.

## 0. Implementation and persistence status

Status progression is strict: `designed` means the schema exists only here; `implemented` means a deterministic generator and persistence key exist; `DB-verified` means every generated natural key was read back from a physical MongoDB collection and its domain integrity checks passed. Computed API projections and local JSON files do not qualify as DB verification.

| Domain | Entity / persisted collection | Status |
|---|---|---|
| Calendar | `planning_calendar_versions` | DB-verified |
| Calendar | `planning_weeks` | DB-verified |
| Demand master | SKU/product lifecycle fields in `sop_skus` | DB-verified |
| Demand master | `lifecycle_transition_history` | DB-verified |
| NPI | `npi_products` | DB-verified |
| NPI | `npi_readiness_items` | DB-verified |
| Events | `event_templates` | DB-verified |
| Events | `demand_events` | DB-verified |
| Forecast | `forecast_vintages` | DB-verified |
| Forecast | `forecast_accuracy_history` | DB-verified |
| Demand factors | `factor_adjusted_demand_proposals` including persisted lines | DB-verified |
| Shared workflow | `workflow_instances` | DB-verified |
| Shared workflow | `workflow_steps` | DB-verified |
| Shared workflow | `entity_audit_events` | DB-verified |
| Official plan | `consensus_plan_versions` | DB-verified |
| Official plan | `consensus_plan_lines` | DB-verified |
| KPI | `kpi_definitions` | DB-verified |
| KPI | `kpi_observations` | DB-verified |
| Identity | `users` | DB-verified |
| Identity | `role_assignments` | DB-verified |
| Notification | `notification_subscriptions` | DB-verified |
| Notification | `notification_deliveries` | DB-verified |
| Reporting | `report_jobs` | DB-verified |
| Reporting | `report_artifacts` | DB-verified |
| Integration | `integration_runs` | DB-verified |
| Market | `market_benchmark_facts` | DB-verified |
| Channel | `channel_inventory_norms` | DB-verified |
| Commercial | `commercial_schemes` | DB-verified |
| Credit | `distributor_credit_accounts` | DB-verified |
| Credit | `distributor_credit_snapshots` | DB-verified |
| Dealer | `dealers` | DB-verified |
| Dealer | `dealer_sku_weekly` | DB-verified |
| Orders | Order amendments/approvals in shared `workflow_instances`, `workflow_steps`, and `entity_audit_events` | DB-verified |
| Dispatch | `advance_ship_notices` including persisted lines | DB-verified |
| Dispatch | `dispatch_milestones` | DB-verified |
| Sourcing | `supplier_master` | DB-verified |
| Sourcing | `manufacturing_partners` | DB-verified |
| Sourcing | `manufacturing_partner_lines` | DB-verified |
| Sourcing | `supplier_reliability_history` | DB-verified |
| Procurement | Extended `purchase_orders` including persisted lines | DB-verified |
| Procurement | `po_exclusions` | DB-verified |
| Procurement | `po_revisions` | DB-verified |
| Procurement | `po_adherence_observations` | DB-verified |
| Capacity | `line_capacity_plans` | DB-verified |
| Capacity | `capacity_expansion_plans` | DB-verified |
| Production | `production_execution_events` | DB-verified |
| Quality | `goods_receipt_inspections` | DB-verified |
| Imports | `import_shipment_milestones` | DB-verified |
| Transfers | `transfer_milestones` | DB-verified |
| Reorder | `reorder_recommendation_versions` including persisted lines | DB-verified |
| Reorder | `reorder_decisions` | DB-verified |
| Inventory scenario | `inventory_scenario_versions` | DB-verified |
| Inventory scenario | `inventory_scenario_lines` | DB-verified |
| Inventory health | `inventory_health_observations` | DB-verified |
| Inventory aging | `inventory_batches` | DB-verified |
| Inventory aging | `inventory_batch_movements` | DB-verified |
| Scenario | `scenario_versions` | DB-verified |
| Scenario | `scenario_assumption_sets` including persisted assumption rows | DB-verified |
| Scenario | `scenario_output_lines` | DB-verified |
| Finance | `financial_plan_versions` | DB-verified |
| Finance | `budget_targets` | DB-verified |
| Receivables | `customer_invoices` including persisted lines | DB-verified |
| Receivables | `cash_receipts` including persisted allocations | DB-verified |
| Receivables | `receivable_snapshots` | DB-verified |
| Chat evidence | `assistant_grounding_traces` | DB-verified |

Verification evidence is regenerated at [DATA_MODEL_DB_VERIFICATION.json](./DATA_MODEL_DB_VERIFICATION.json). The verifier accepts retained historical rows: the gate requires complete generated-key coverage, valid natural keys and provenance, and passing identities rather than exact total collection counts.

This is the target persisted model for every entity marked `N` in `DATA_GAPS.md`, plus the existing entities that must be extended to make those gaps useful. It preserves the generator's current deterministic conventions and makes stored, versioned facts—not request-time reconstruction—the source for modules and charts.

## 1. Non-negotiable generation conventions

### One random stream

- Keep the existing `mulberry32(20250701)` instance in `lib/dummyData.js`. Do not create, reseed, or import another pseudo-random generator.
- Sort parent inputs before consuming `rand`: calendar week, then SKU code, distributor code, partner code, and child sequence. Appending a new entity generator must not reorder existing generator calls. Prefer appending new generators after the existing dataset is complete.
- Use the shared stream only when a reproducible sequence is desirable, such as selecting a categorical state or drawing a base master value.
- Use the existing FNV-1a `stableUnit01(key)` for order-independent entity noise. Define `u(key) = stableUnit01(key)`, `signed(key, a) = (2u(key)-1)a`, and `pick(key, values) = values[floor(u(key) * values.length)]` (with the index capped at `length - 1`). These are notation, not a second RNG.
- Stable keys must include entity type, natural key, version, and measure: for example `forecast|SKU-001|DIST-NORTH|2026-W38|H13|V1|qty`. Never hash array position alone.
- All generated IDs, dates, statuses, and audit timestamps derive from the fixed planning anchor/calendar. Do not use `Date.now()`, `Math.random()`, or insertion order.

### Numeric and business rules

- Quantities are non-negative integers after `round`; rates are stored at four decimal places and clamped to their defined interval.
- Currency is `INR`; money is stored as integer paise (`amountPaise`) or integer rupees where the existing collection already establishes that convention. Every monetary schema below includes `currency: "INR"`.
- Price is never below landed/unit cost unless a scheme line explicitly records the funding source that absorbs the difference.
- Percentages in storage are fractions in `[0,1]`, not display percentages.
- Foreign keys use stable business IDs (`skuId`, `distributorId`, `partnerId`, `weekId`, `planVersionId`). Mongo `_id` is never a cross-collection key.
- Mutable masters have `effectiveFromWeek`, `effectiveToWeek`, `version`, `status`, `createdAt`, and `updatedAt`. Facts are append-only or replaced only as part of a full deterministic seed transaction.
- Every generated record carries `dataVersion: "DM-2026-W33-V1"` and `generationSeed: 20250701`. Editable records retain those fields as provenance and add `source: "SEED" | "USER" | "INTEGRATION"`.

## 2. Calendar decision (DR0)

The user-facing operational window remains **26 aligned weekly buckets**, but the retained canonical feature window is extended to **157 ISO weeks: 104 closed-history weeks plus the anchor/current week and 52 future weeks**. `2026-W33` remains the anchor. This is not a blanket UI expansion.

The extension is required because DR0 in the quality audit found that the current W08-W33 slice ends before the planned W38/W42 NPI launches and the W40-W49 festive period. It is also required to store a full annual seasonal cycle, a complete 12-week NPI ramp, 27-52-week forward forecasts, lifecycle transitions, long-capacity plans, and a 52-week closed backtest for forecasts issued at horizons through 52 weeks. Supporting that backtest needs 104 closed weeks: the earliest scored target week is preceded by its W-52 issued forecast. Every ordinary API view still selects a named 26-week slice from the same calendar version.

### `planning_calendar_versions`

Grain/key: one version, `calendarVersionId`.

Fields: `calendarVersionId`, `label`, `anchorWeekId`, `historyWeeks: 104`, `futureWeeks: 52`, `defaultViewWeeks: 26`, `timezone: "Asia/Kolkata"`, `weekStartsOn: "MONDAY"`, `status`, `effectiveAt`, common provenance fields.

Generation: one active row named `CAL-2026-W33-V1`. Dates are obtained only by integer multiples of seven days from the existing anchor.

### `planning_weeks`

Grain/key: `calendarVersionId × weekId`.

Fields: `weekId` (`YYYY-Www`), `weekIndex` (`-104..52`, anchor `0`), `startDate`, `endDate`, `fiscalYear`, `fiscalQuarter`, `fiscalMonth`, `isClosed`, `isAnchor`, `isDefault26WeekView`, `festiveLabel`, `calendarVersionId`.

Generation: `startDate = anchorMonday + 7 × weekIndex`; `isClosed = weekIndex < 0`; default historical views select `-25..0`, and default forward views select `0..25`. Event membership is joined from `demand_events`; `festiveLabel` is a denormalized display cache, never an input to forecasting.

## 3. Demand, forecast, and consensus core

### SKU lifecycle master and transition history

Extend the real SKU/product master (do not keep lifecycle as a request-time side table) with:

`lifecycleStage: "NEW" | "GROWTH" | "MATURE" | "DECLINE" | "EOL"`, `lifecycleStageSinceWeek`, `launchWeek`, `hasSalesHistory`, `forecastMethod`, `analogSkuIds`, `expectedStageEndWeek`, `replacementSkuId`, `discontinueWeek`, and effective/version metadata.

The forecast engine must read these fields. Method routing is:

| Stage | Forecast method | Seasonal curve allowed? |
|---|---|---|
| NEW | `NPI_RAMP` using analog and readiness | No, until the ramp completes |
| GROWTH | `TREND_EVENT` | Yes, with capped event uplift |
| MATURE | `SEASONAL_BASELINE` | Yes |
| DECLINE | `RAMP_DOWN` | Yes, attenuated |
| EOL | `EOL_CLEARANCE`, then zero | Only an explicit clearance event |

For seeded existing SKUs, assign a believable mix using category age and `u("lifecycle|" + skuId)`: 2 growth, 9 mature, 3 decline, 1 EOL; do not randomly allow all SKUs to land in one class. New NPI products use `NEW` and `hasSalesHistory: false`.

`lifecycle_transition_history` grain/key: one transition, `transitionId`. Fields: `skuId`, `oldStage`, `newStage`, `effectiveWeek`, `effectiveToWeek`, `actorUserId`, `actorRole`, `reasonCode`, `comment`, `occurredAt`, `source`, provenance. Generate the current stage's initial transition at its `lifecycleStageSinceWeek`; later seeded transitions are ordered by SKU launch age. User edits append a row and close the preceding interval; they never overwrite history.

### NPI pipeline and ramp forecast

Use boAt-realistic seed products such as `Airdopes Nova 181`, `Rockerz Apex 300`, `Stone Ignite 750`, and `Lunar Vista Pro`. These are demonstration names, not claims about a live catalog.

`npi_products` grain/key: one pre-launch product, `npiId` (and reserved `skuId`). Fields: `productName`, `category`, `subCategory`, `launchWeek`, `rampWeeks`, `rampCurve: "LINEAR" | "S_CURVE" | "HOCKEY_STICK"`, `analogSkuIds`, `targetPeakWeeklyUnits`, `mrpPaise`, `plannedNetPricePaise`, `unitCostPaise`, `currency`, `lifecycleStage: "NEW"`, `hasSalesHistory: false`, `readinessPct`, `cannibalizedSkuIds`, `status`, owner and version fields.

There must be **no historical sales rows before `launchWeek`**. NPI demand is stored in `forecast_vintages`, not fabricated as actual history. For target week `w`, let `t = clamp((wIndex-launchIndex+1)/rampWeeks, 0, 1)`:

- `LINEAR(t) = t`.
- `S_CURVE(t) = (logistic(8(t-.5))-logistic(-4))/(logistic(4)-logistic(-4))`.
- `HOCKEY_STICK(t) = 0.35t` for `t < .5`, otherwise `.175 + 1.65(t-.5)`; clamp to 1.
- `readinessFactor = 0.65 + 0.35 × readinessPct`.
- `analogWeekly = weighted mean of the analog SKUs' stored actuals for weeks -13..-1`, weights `.6/.3/.1`.
- `peak = round(max(targetPeakWeeklyUnits, analogWeekly × (0.60 + 0.30u("npi-peak|"+npiId))))`.
- `forecastQty = round(peak × curve(t) × readinessFactor × channelShare × (1 + signed(stableKey,.05)))`.

No seasonality multiplier is applied during the ramp. After `launchWeek + rampWeeks`, a transition to `GROWTH` enables the normal trend/event method. Closed-week actuals after launch use `forecastQty × (0.85 + 0.25u("npi-realization|..."))`; the actual is then immutable. Cannibalized mature SKU forecasts are reduced by `min(.25, npiRampShare × .18)` and the adjustment is stored as a factor proposal line.

`npi_readiness_items` grain/key: `npiId × gateCode × itemCode`. Fields: `gateCode: "BOM" | "ODM" | "IMPORT" | "LISTING"`, `itemCode`, `description`, `weight`, `ownerUserId`, `dueWeek`, `status`, `completedAt`, `evidenceType`, `evidenceRef`, `blockedReason`, provenance. Generate the required item template per category; completion uses real references (approved BOM, partner allocation, import milestone, channel listing). `readinessPct = sum(completed weights)/sum(required weights)`, so the percentage cannot exist without evidence.

### Editable event and promotion calendar

`event_templates` grain/key: `eventTemplateId`. Fields: `name`, `eventType`, `recurrenceRule`, `defaultLeadWeeks`, `defaultDurationWeeks`, `defaultScope`, `defaultUpliftPct`, `upliftShape`, `stackingGroup`, `maxStackedUpliftPct`, `active`, effective/version metadata. Seed templates for Republic Day, Summer Audio, Prime Day/e-commerce, Independence Day, festive marketplace sale, Navratri/Dussehra, Diwali, and year-end gifting.

`demand_events` is the editable source replacing every hardcoded week list. Grain/key: `eventId × version`. Fields: `eventTemplateId`, `name`, `startWeek`, `endWeek`, `eventType`, `status`, `skuIds`, `categories`, `channelIds`, `regionIds`, `upliftPct`, `upliftShape`, `fundingSchemeId`, `ownerUserId`, `approvedBy`, `notes`, effective/version/audit fields.

For seeded years, resolve recurring dates into `planning_weeks`; never encode week numbers inside the forecast function. For week position `p` in an event of `d` weeks, triangular uplift is `upliftPct × (1 - abs(2p/(d-1)-1) × .35)` when `d > 1`, and equals `upliftPct` for a one-week event; flat uses `upliftPct`; launch-tail uses `upliftPct × exp(-.35p)`. Apply eligible events as `min(groupCap, product(1+eventUplift)-1)`. Add only `signed("event-realization|eventId|sku|channel|week", .04)` to closed-week actual realization. The retained feature window is explicitly needed for W40-W49 festive events absent from the former W08-W33 window.

### Forecast vintages and stored accuracy

`forecast_vintages` grain/unique key: `skuId × channelId × targetWeek × horizonWeeks × modelCode × issuedWeek × forecastVersionId`.

Fields: `forecastId`, key fields above, `lifecycleStageAtIssue`, `method`, `baselineQty`, `eventUpliftQty`, `factorAdjustmentQty`, `consensusAdjustmentQty`, `forecastQty`, `lowerQty`, `upperQty`, `sourceCalendarVersionId`, `frozen`, `issuedAt`, `createdBy`, provenance.

Generation uses the lifecycle-selected method. For deterministic model error around the stored base, `sigma = {.07 SHORT(1-4), .13 MID(5-26), .22 LONG(27-52)} × lifecycleMultiplier` where NEW 1.35, GROWTH 1.15, MATURE 0.85, DECLINE 1.10, EOL 1.25. `forecastQty = round(max(0, baseQty × (1 + signed(forecastStableKey, sigma))))`. Bounds are `forecastQty × (1 ± 1.28sigma)` and never negative. Produce representative horizons `1, 4, 13, 26, 39, 52`; the longer retained calendar is mandatory for horizons above 26.

`forecast_accuracy_history` grain/unique key: `forecastId × actualVersionId`.

Fields: `accuracyId`, `forecastId`, `skuId`, `channelId`, `targetWeek`, `horizonWeeks`, `horizonBand`, `modelCode`, **`forecastQty`**, **`actualQty`**, `signedErrorQty`, `absoluteErrorQty`, `absolutePctError`, `accuracyPct`, `biasPct`, `actualVersionId`, `closedAt`, provenance. Both values are copied into this immutable record when the target week closes; consumers must not join to a later mutable forecast. Formulae: `error = forecast-actual`; `APE = null` when actual is zero; `accuracy = max(0,1-abs(error)/max(actual,1))`; `biasPct = error/max(actual,1)`. Aggregate WAPE is `1-sum(abs(error))/max(sum(actual),1)`, calculated from stored rows. Seed one accuracy row for every eligible closed forecast/actual pair at horizons `1, 4, 13, 26, 39, 52`; the 104 closed weeks permit a complete 52-target-week score history even at H52.

### Factor proposals, consensus, and official plan

`factor_adjusted_demand_proposals` grain/key: `proposalId` header plus `proposalId × forecastId` lines. Header fields: `sourceForecastVersionId`, `scenarioVersionId`, `status`, `authorUserId`, `submittedAt`, `approvedAt`, `comment`. Line fields: `forecastId`, `baseQty`, `factorIds`, `individualAdjustments`, `netAdjustmentQty`, `proposedQty`. Formula: apply enabled price, promotion, event, market, and cannibalization factors in declared priority, cap net uplift to `[-.40,.75]`, and store each component; never mutate the baseline vintage.

Use one workflow model for Demand and Production:

- `workflow_instances`: `workflowId`, `workflowType: "DEMAND_CONSENSUS" | "PRODUCTION_SIGNOFF"`, `subjectType`, `subjectId`, `sourceVersionId`, `status`, `currentStep`, `dueAt`, `lockedAt`, provenance.
- `workflow_steps`: grain `workflowId × stepSequence`; fields `stepCode`, `assignedRole`, `assignedUserId`, `status`, `decision`, `comment`, `actedAt`, `dueAt`.
- `entity_audit_events`: reusable append-only audit grain `auditId`; fields `workflowId`, `workflowType`, `stepSequence`, `entityType`, `entityId`, `action`, `fieldPath`, `oldValue`, `newValue`, `actorUserId`, `actorRole`, `reasonCode`, `comment`, `occurredAt`, `sequence`, provenance. Demand and Production sign-off must both write this collection; do not create separate audit schemas.

Seed assignments in the order Category, Sales, S&OP, Finance for demand and Supply Planner, Procurement, Plant, S&OP for production. Status selection uses `u("workflow-status|"+workflowId)` but must respect sequence: a later step cannot be complete while an earlier one is open. Timestamps are anchor-relative and monotonically increasing.

`consensus_plan_versions` grain/key: `planVersionId`; fields `calendarVersionId`, `sourceScenarioVersionId`, `demandForecastVersionId`, `workflowId`, `name`, `status: "DRAFT" | "APPROVED" | "LOCKED"`, `ownerUserId`, `approvedAt`, `lockedThroughWeek`, `publishedAt`, provenance.

`consensus_plan_lines` grain/key: `planVersionId × skuId × weekId`; fields `channelDemandQty`, `consensusDemandQty`, `plannedProductionQty`, `plannedPurchaseQty`, `plannedTransferInQty`, `plannedTransferOutQty`, `openingInventoryQty`, `closingInventoryQty`, `unmetDemandQty`, `capacityGapQty`, `isLocked`, source IDs. Formula follows the inventory identity `closing = max(0, opening + production + purchases + transferIn - transferOut - fulfilledDemand)` and `unmet = max(0, demand - available)`. Locked lines are copied forward byte-for-byte into later versions.

## 4. Shared platform entities

### KPI definitions and observations

`kpi_definitions` grain/key: `kpiCode × effectiveFromWeek`. Fields: `name`, `module`, `description`, `formulaCode`, `numeratorMeasure`, `denominatorMeasure`, `unit`, `aggregation`, `direction`, `greenThreshold`, `amberThreshold`, `ownerRole`, `visibleRoles`, `sourceEntityTypes`, effective/version metadata. Seed a fixed registry for fill rate, forecast WAPE/accuracy/bias, inventory DOS, stockout rate, capacity utilization, supplier OTD, PO handover adherence, OEE, revenue, gross margin, and cash collection.

`kpi_observations` grain/key: `kpiCode × scopeType × scopeId × weekId × dataVersion`. Fields: `value`, `numerator`, `denominator`, `target`, `status`, `sourceVersionIds`, `computedAt`, `isFinal`, provenance. Values are calculated only from stored facts and the registry formula. Example: fill rate `= sum(fulfilledQty)/max(sum(orderedQty),1)`; status compares the rounded stored value with the effective thresholds. There is no random noise in KPI facts.

### Identity and authorization

`users` grain/key: `userId`. Fields: `displayName`, `email`, `department`, `title`, `status`, `defaultRole`, `createdAt`, provenance. Seed named role accounts such as `demand.planner@boat.com`, `supply.planner@boat.com`, `category.manager@boat.com`, `sales.manager@boat.com`, `finance.controller@boat.com`, and `sop.lead@boat.com`; these are demo identities and contain no credentials.

`role_assignments` grain/key: `assignmentId`. Fields: `userId`, `roleCode`, `scopeType`, `scopeIds`, `effectiveFrom`, `effectiveTo`, `grantedBy`, `status`, provenance. Generation is a static, reviewed permission matrix; it does not use random role allocation. Mutation APIs must authorize from effective persisted assignments.

### Notifications

`notification_subscriptions` grain/key: `subscriptionId`. Fields: `userId`/`roleCode`, `eventType`, `scope`, `channel: "IN_APP" | "EMAIL"`, `minimumSeverity`, `active`, effective metadata.

`notification_deliveries` grain/key: `notificationId × recipientUserId × channel`. Fields: `sourceEntityType`, `sourceEntityId`, `eventType`, `severity`, `subject`, `bodyTemplate`, `createdAt`, `scheduledAt`, `sentAt`, `readAt`, `status`, `failureCode`, provenance. Generate notifications only from persisted due dates, failures, threshold breaches, and workflow transitions. `scheduledAt = eventAt + channelDelay`; delivery state comes from `u("notification|"+key)` with 94% delivered, 4% pending, 2% failed, while dates remain anchor-relative.

### Export and reporting jobs

`report_jobs` grain/key: `jobId`. Fields: `reportType`, `requestedBy`, `requestedAt`, `parameters`, `sourceVersionIds`, `format`, `status`, `startedAt`, `completedAt`, `rowCount`, `errorCode`, provenance.

`report_artifacts` grain/key: `artifactId`. Fields: `jobId`, `fileName`, `mimeType`, `storageKey`, `byteSize`, `checksumFNV1a`, `expiresAt`, `createdAt`, provenance. Seed representative completed jobs from locked plan and KPI versions. `rowCount` equals the selected persisted rows; `checksumFNV1a` hashes the canonical JSON payload. No binary file is required in seed data.

### Feed receipts and run history

`integration_runs` grain/key: `runId`. Fields: `integrationId`, `sourceSystem`, `feedType`, `scheduledFor`, `startedAt`, `endedAt`, `status: "SUCCESS" | "PARTIAL" | "FAILED"`, `sourceFile`, `sourceChecksumFNV1a`, `expectedRows`, `receivedRows`, `acceptedRows`, `rejectedRows`, `firstPeriod`, `lastPeriod`, `gapPeriods`, `errorCode`, `errorDetail`, provenance.

Generate one row per configured cadence in the retained history. `receivedRows = expectedRows - floor(expectedRows × max(0, signed("feed-loss|"+runId,.018)))`; status is SUCCESS if accepted equals expected and gaps are empty, PARTIAL for recoverable omissions, FAILED only when `u("feed-fail|"+runId) < .025`. Gap periods are derived by comparing received natural keys to `planning_weeks`, not invented separately. The checksum is FNV-1a of canonical accepted rows.

### Competitor and market benchmarks

`market_benchmark_facts` grain/key: `benchmarkId`; natural key `brand × analogueCode × weekId × measure × sourceId`. Fields: `brand`, `category`, `analogueSkuName`, `measure: "NET_PRICE" | "RATING" | "SHARE_INDEX" | "PROMO_DEPTH"`, `value`, `unit`, `currency`, `sourceId`, `sourceType`, `observedAt`, `confidence`, provenance.

Use plausible competitors by category (Noise, Fire-Boltt, JBL, Boult, realme) and label all seeded observations `sourceType: "SYNTHETIC_MARKET_PANEL"`; never imply live scraped market data. INR price bands are anchored to the comparable boAt SKU net price: competitor price `= round(boatPrice × (0.80 + 0.55u(stableKey))/100)×100`, clamped to the category band. Rating is `[3.6,4.6]`, promotion depth `[.05,.40]`, and share index `[60,140]`, all from stable hashes.

## 5. Channel, commercial, and order entities

### Channel inventory norms

`channel_inventory_norms` grain/unique key: `skuId × distributorId × effectiveFromWeek × version`.

Fields: `normId`, `skuId`, `distributorId`, `leadTimeDays`, `reviewPeriodDays`, `serviceLevel`, `zScore`, `meanWeeklyDemand`, `demandCv`, `safetyStockQty`, `cycleStockQty`, `targetStockQty`, `minDos`, `targetDos`, `maxDos`, `overrideReason`, `approvedBy`, effective/version/provenance fields.

Compute from stored closed-week dealer/distributor actuals: `meanDaily = meanWeekly/7`; `sigmaLead = meanDaily × demandCv × sqrt(leadTimeDays)`; `safety = round(z × sigmaLead)`; `cycle = round(meanDaily × reviewPeriodDays)`; `target = safety + cycle`; `targetDos = clamp(round(target/max(meanDaily,1)), 7, 45)`, `minDos = max(5,targetDos-5)`, `maxDos = min(60,targetDos+8)`. Service level is `.95`, `.975`, or `.99` by ABC class; z is `1.645`, `1.96`, or `2.326`. If a SKU/distributor has no history, use its category/channel analog aggregate and flag `basis: "ANALOG"`.

### Schemes and promotions

`commercial_schemes` grain/key: `schemeId × version`. Fields: `name`, `schemeType`, `startWeek`, `endWeek`, `eligibleDistributorIds`, `eligibleDealerTiers`, `skuIds`/`categories`, `minOrderQty`, `discountPct`, `perUnitFundingPaise`, `manufacturerFundingPct`, `channelFundingPct`, `budgetPaise`, `consumedBudgetPaise`, `currency`, `status`, `eventId`, owner/approval/effective metadata.

Seed schemes from approved `demand_events`, with `.05-.18` discount and funding split summing to 1. `budget = round(eligibleForecastUnits × perUnitFunding)` and consumption is the sum of actual eligible invoiced lines. The realized net price is `max(unitCost + requiredMargin, listPrice-discount-funding)`; schemes cannot silently create price-below-cost records.

### Distributor credit and accounts exposure

`distributor_credit_accounts` grain/key: `distributorId × effectiveFrom`. Fields: `creditLimitPaise`, `paymentTermsDays`, `riskClass`, `temporaryLimitPaise`, `temporaryLimitExpiry`, `blocked`, `blockReason`, `currency`, effective/version fields.

`distributor_credit_snapshots` grain/key: `distributorId × asOfDate × dataVersion`. Fields: `invoicedOpenPaise`, `unbilledDispatchPaise`, `approvedOrderExposurePaise`, `overduePaise`, `availableCreditPaise`, `utilizationPct`, source IDs. Tier base limits are INR 1.5-5 crore, adjusted by `0.85 + .30u("credit-limit|"+distributorId)`. `available = max(0, limit+temporaryLimit-open-unbilled-approved)`; no qualitative low/medium/high proxy substitutes for this calculation.

### Dealer/outlet and sell-through facts

`dealers` grain/key: `dealerId`. Fields: `dealerName`, `distributorId`, `dealerTier`, `channelType`, `city`, `state`, `region`, `pinCode`, `latitude`, `longitude`, `onboardedWeek`, `active`, `listedCategoryCodes`, `closedWeek`, provenance. Names combine a city/locality token with realistic retail suffixes (`Mobile Hub`, `Digital World`, `Electronics Point`) and a stable sequence. Generate a deterministic representative network per distributor tier; geography must be compatible with the parent distributor, not randomly cross-region.

`dealer_sku_weekly` grain/key: `dealerId × skuId × weekId × dataVersion`. Fields: `openingQty`, `receivedQty`, `sellThroughQty`, `returnsQty`, `closingQty`, `listed`, `inStockDays`, `activeSaleDays`, `netSalesPaise`, `sourceRunId`. Generate sparse rows only for listed SKUs. `sellThrough = min(opening+received, round(localDemand × listingFactor × (1+signed(key,.12))))`; `closing = max(0,opening+received-sellThrough+returns)`; `activeSaleDays > 0` proves an active dealer. Aggregate registered, stocked, and active counts from these identities/facts.

### Order amendments and approvals

Order changes use the shared `entity_audit_events` schema with `entityType: "DISTRIBUTOR_ORDER"`; line snapshots are stored in `oldValue/newValue`. `workflow_instances` uses `workflowType: "ORDER_APPROVAL"` and steps Sales, Credit, Supply. Decision is `APPROVE | REJECT | RETURN | CANCEL`; reason codes include `CREDIT_LIMIT`, `PRICE_EXCEPTION`, `STOCK_SHORTAGE`, `CUSTOMER_CHANGE`, and `DUPLICATE`. Seed 1-3 chronologically valid events for orders that already have amendments or pending approval. The current order is the fold of the ordered event sequence; no mutable `pendingApproval` blob is authoritative.

### ASN and dispatch milestones

`advance_ship_notices` grain/key: `asnId`; child grain `asnId × asnLineId`. Header fields: `orderId`, `warehouseId`, `carrierId`, `vehicleRef`, `sourceDocument`, `dispatchTimestamp`, `expectedArrival`, `status`, `sourceRunId`. Line fields: `orderLineId`, `skuId`, `shippedQty`, `batchIds`. Generate ASNs only after an approved order and allocate `shippedQty <= remainingApprovedQty`; split count is `1 + floor(2u("asn-split|"+orderId))`.

`dispatch_milestones` grain/key: `milestoneId`. Fields: `asnId`, `orderId`, `eventType: "ALLOCATED" | "PACKED" | "DISPATCHED" | "DELIVERED" | "CANCELLED"`, `eventAt`, `locationId`, `quantity`, `actorUserId`, `sourceSystem`, `evidenceRef`, `reasonCode`, provenance. Generate only legal sequences with monotonically increasing times. Duration uses warehouse-to-region transit days plus `floor(3u(stableKey))`; delivered quantity cannot exceed dispatched quantity.

## 6. Supply, sourcing, capacity, and logistics entities

### ODM/EMS partner, line, and reliability master

Keep supplier identity in `supplier_master`, but make manufacturing attributes persisted rather than deriving ODM/EMS type from array position.

`manufacturing_partners` grain/key: one qualified manufacturing partner, `partnerId` (the existing `supplierCode` remains an alternate key). Fields: `partnerName`, `partnerType: "ODM" | "EMS"`, `tier`, `country`, `city`, `qualifiedCategoryCodes`, `defaultLeadTimeDays`, `totalCapacityUnitsPerWeek`, `contractedCapacityUnitsPerWeek`, `spotCapacityUnitsPerWeek`, `npiReservedCapacityUnitsPerWeek`, `commercialCurrency: "INR"`, `status`, and effective/version/provenance fields.

Seed exactly four fictional demonstration partners with boAt-realistic Indian electronics-manufacturing names: `WaveCraft EMS India`, `SonicEdge Devices`, `Aarav Wearables Manufacturing`, and `Trident Audio Systems`. They must be labelled synthetic and must not imply a real supplier relationship. Allocate two EMS and two ODM records. For sorted partner `i`, draw the base once from the existing Mulberry32 stream after existing generators; then set `totalCapacity = roundTo1000(180000 + rand() * 220000)`, `contractedCapacity = roundTo1000(totalCapacity * (0.68 + 0.14u("partner|"+partnerId+"|contracted")))`, `npiReservedCapacity = roundTo1000(totalCapacity * (0.06 + 0.06u("partner|"+partnerId+"|npi")))`, and `spotCapacity = totalCapacity - contractedCapacity`. Contracted plus spot capacity must reconcile exactly to total capacity. NPI reserve is a non-negative tagged subset of contracted capacity and is not added again when reconciling available capacity.

`manufacturing_partner_lines` grain/unique key: `partnerId x lineId x effectiveFromWeek`. Fields: `lineName`, `lineType`, `qualifiedSkuIds`, `qualifiedCategoryCodes`, `shiftsPerDay`, `hoursPerShift`, `ratedUnitsPerHour`, `yieldRate`, `changeoverHours`, `lineCapacityUnitsPerWeek`, `minimumOrderQty`, `orderMultiple`, `leadTimeDays`, `npiCapable`, `status`, and effective/version/provenance fields. Generate two or three lines per partner. `grossWeeklyCapacity = shiftsPerDay * hoursPerShift * workingDays * ratedUnitsPerHour`; `lineCapacity = roundTo100(max(0, grossWeeklyCapacity * yieldRate - changeoverHours * ratedUnitsPerHour))`. Scale line capacities proportionally, with the final line taking the rounding residual, so their sum equals the partner total.

`supplier_reliability_history` grain/unique key: `partnerId x measurementWeek x windowWeeks x dataVersion`, where `windowWeeks` is `4 | 13 | 52`. Fields: `eligiblePoCount`, `onTimePoCount`, `onTimeDeliveryRate`, `quotedLeadTimeDays`, `actualAverageLeadTimeDays`, `leadTimeVarianceDays`, `leadTimeConsistencyScore`, `acceptedQty`, `rejectedQty`, `qualityAcceptanceRate`, `reliabilityScore`, `reliabilityGrade`, and source IDs. Calculate only from stored PO handovers and quality inspections: `OTD = onTime/eligible`, `leadTimeConsistency = max(0, 1 - mean(abs(actualLead-quotedLead))/max(quotedLead,1))`, `qualityAcceptance = accepted/max(accepted+rejected,1)`, and `reliability = 100 * (0.50*OTD + 0.30*leadTimeConsistency + 0.20*qualityAcceptance)`. Grade `A >= 92`, `B >= 85`, `C >= 75`, otherwise `D`. Stable noise belongs in the underlying seeded PO and inspection facts, never in this aggregate.

### Purchase orders, handover adherence, exclusions, and revisions

Extend `purchase_orders`; do not create a parallel PO header. Grain/key: one PO header, `poNumber`, with child grain `poNumber x poLineId`.

Header fields: `partnerId`, `poType: "DOMESTIC" | "IMPORT"`, `orderDate`, `currency: "INR"`, `status`, `plannedHandoverDate`, `actualHandoverDate`, `promisedDeliveryDate`, `actualReceiptDate`, `shipFromLocation`, `receiveAtLocationId`, `incoterm`, `approvedBy`, `approvedAt`, `currentRevision`, and provenance. Line fields: `skuId`, `orderedQty`, `handedOverQty`, `receivedQty`, `unitPricePaise`, `taxPaise`, `lineValuePaise`, `productionNeedWeek`, and `sourcePlanVersionId`. `lineValuePaise = orderedQty * unitPricePaise + taxPaise`; header value is the exact sum of lines.

Generate `plannedHandoverDate = orderDate + partner/line leadTimeDays`. For eligible completed POs, `actualHandoverDate = plannedHandoverDate + round(signed("po-handover|"+poNumber, leadTimeSpreadDays))`, where spread is 2 days for grade A, 4 for B, 7 for C, and 10 for D; clamp actual handover after order date. `handoverVarianceDays = actualHandoverDate - plannedHandoverDate`, and a PO is on time when the variance is `<= 0`. Open POs have a null actual date and an at-risk flag based on anchor date versus planned handover; never fabricate an actual for an open PO.

`po_exclusions` grain/key: `poNumber x exclusionVersion`. Fields: `exclusionCode: "NONE" | "SUPPLIER_FORCE_MAJEURE" | "BUYER_HOLD" | "QUALITY_REJECTION" | "PARTIAL_ACCEPT" | "CANCELLED_BEFORE_RELEASE" | "DATA_ERROR"`, `reasonText`, `effectiveFrom`, `effectiveTo`, `flaggedBy`, `approvedBy`, `flaggedAt`, `clearedAt`, and provenance. Only approved exclusions remove a PO from an adherence denominator. `PARTIAL_ACCEPT` excludes only the cancelled balance; it does not erase the delivered portion. `CLEAR` is an action that closes an exclusion interval, not a stored reason code.

`po_revisions` grain/key: `poNumber x revisionNo`. Fields: `changedFields`, `oldValues`, `newValues`, `reasonCode`, `comment`, `changedBy`, `changedAt`, and `sourceWorkflowId`. Seed zero to two revisions using `u("po-revisions|"+poNumber)` and legal chronology. The current PO is the fold of revisions in sequence. `po_adherence_observations` continues to be computed by window from eligible stored POs; no generated trend offset is permitted.

### Time-phased partner and plant-line capacity

`line_capacity_plans` grain/unique key: `capacityPlanVersionId x lineId x weekId`. Fields: `partnerId` or `plantId`, `ratedCapacityQty`, `contractedCapacityQty`, `spotCapacityQty`, `npiReservedQty`, `maintenanceLossQty`, `shutdownLossQty`, `expansionGainQty`, `availableCapacityQty`, `allocatedProductionQty`, `remainingCapacityQty`, `utilizationRate`, `sourceExpansionIds`, `status`, and provenance.

Start from the effective line master. Seed planned maintenance only where `u("maintenance|"+lineId+"|"+weekId) < .06`; its loss is `round(rated * (0.05 + .10u(stableKey)))`. Approved expansion applies only on or after commissioning week. `available = max(0, contracted + spot + expansionGain - maintenanceLoss - shutdownLoss)`; `remaining = max(0, available-allocated)`; `utilization = allocated/max(available,1)`. Capacity is never independently randomized after these inputs. Store the full 157-week feature window because medium/long 27-52-week capacity views are one of the explicit DR0 exceptions to the normal 26-week display slice.

`capacity_expansion_plans` grain/key: `expansionId`. Fields: `partnerId`/`plantId`, `lineId`, `name`, `approvalStatus`, `approvedWeek`, `plannedCommissioningWeek`, `actualCommissioningWeek`, `capacityDeltaUnitsPerWeek`, `capexPaise`, `currency: "INR"`, `ownerUserId`, `sourceScenarioVersionId`, and audit/provenance fields. Generate a small number of proposed/approved items only for lines whose 13-week average utilization exceeds 0.88. `capacityDelta = roundTo1000(ratedCapacity * (0.15 + .20u(stableKey)))`; `capexPaise = capacityDelta * (8500 + floor(5500u(stableKey)))`. Only `COMMISSIONED` records affect capacity facts.

### Production execution and goods-receipt quality

`production_execution_events` grain/key: `executionEventId`; natural key `productionOrderId x lineId x eventStart`. Fields: `skuId`, `plannedQty`, `goodQty`, `rejectedQty`, `reworkQty`, `scheduledMinutes`, `runMinutes`, `downtimeMinutes`, `downtimeReasonCode`, `idealCycleSeconds`, `actualStart`, `actualEnd`, `sourceTimestamp`, `sourceSystem`, and provenance.

For closed production orders, `downtimeMinutes = round(scheduledMinutes * max(0, signed("downtime|"+productionOrderId,.08)+.04))`; `runMinutes = scheduled-downtime`; `grossOutput = floor(runMinutes*60/idealCycleSeconds)`; `rejectedQty = round(grossOutput*(.005+.025u("reject|"+productionOrderId)))`; and `goodQty = max(0,min(plannedQty,grossOutput-rejectedQty+reworkQty))`. OEE is a derived KPI: `availability * performance * quality`, where availability is `run/scheduled`, performance is `(idealCycleSeconds*grossOutput)/(runMinutes*60)`, and quality is `goodQty/max(grossOutput,1)`. Each component is clamped to `[0,1]`.

`goods_receipt_inspections` grain/key: `inspectionId`; natural key `poNumber x poLineId x receiptSequence`. Fields: `partnerId`, `skuId`, `receivedAt`, `receivedQty`, `sampleQty`, `acceptedQty`, `rejectedQty`, `defectCode`, `severity`, `disposition: "ACCEPT" | "REWORK" | "RETURN" | "CONCESSION"`, `batchIds`, `inspectorUserId`, `evidenceRef`, and provenance. `sampleQty = min(receivedQty,max(32,round(sqrt(receivedQty)*8)))`; defect rate is `.004 + .026u("grn-quality|"+naturalKey)` adjusted by partner reliability; `rejectedQty = min(receivedQty,round(receivedQty*defectRate))`, `acceptedQty = receivedQty-rejectedQty`. These facts, not a supplier-master scalar, feed quality and reliability history.

### Import/customs and transfer execution milestones

`import_shipment_milestones` grain/key: `milestoneId`; unique sequence `importShipmentId x sequence`. Fields: `eventType: "BOOKED" | "SUPPLIER_HANDOVER" | "DEPARTED" | "ARRIVED_PORT" | "CUSTOMS_FILED" | "CUSTOMS_CLEARED" | "DC_RECEIVED"`, `plannedAt`, `actualAt`, `portCode`, `locationId`, `quantity`, `actorUserId`, `sourceSystem`, `evidenceRef`, `delayReasonCode`, and provenance. Generate only legal, monotonic sequences. Each actual time equals the preceding actual plus the route/mode duration and `round(signed("import-leg|"+shipmentId+"|"+eventType, legSpreadDays))`; air and sea use different configured base durations. Parent shipment ETA/status is a projection folded from the latest milestone, not a substitute for history.

`transfer_milestones` grain/key: `milestoneId`; unique sequence `transferOrderId x sequence`. Fields: `eventType: "ALLOCATED" | "DISPATCHED" | "IN_TRANSIT" | "RECEIVED" | "SHORT_RECEIPT" | "CANCELLED"`, `eventAt`, `fromLocationId`, `toLocationId`, `dispatchedQty`, `receivedQty`, `carrierId`, `evidenceRef`, `reasonCode`, and provenance. `dispatchAt = orderDate + 1 + floor(2u(stableKey)) days`; arrival uses the persisted lane transit days plus `floor(2u(stableKey))`. Received quantity is `dispatchedQty - damagedQty - lostQty` and never exceeds dispatched quantity. Inventory movements post from milestones exactly once by idempotency key.

## 7. Inventory decision and history entities

### Reorder decisions and releases

`reorder_recommendation_versions` freezes each calculated recommendation rather than relying on a disappearing read model. Grain/key: `recommendationVersionId`; line grain `recommendationVersionId x skuId x locationId`. Header fields: `calculatedAt`, `inventorySnapshotVersionId`, `forecastVersionId`, `policyVersionId`, `calendarVersionId`, `status`, and provenance. Line fields: `projectedStockoutWeek`, `netRequirementQty`, `suggestedOrderQty`, `suggestedReleaseWeek`, `suggestedReceiptWeek`, `supplierId`, `reasonCodes`, and `lineHash`.

`reorder_decisions` grain/key: `decisionId`; natural key `recommendationVersionId x skuId x locationId x decisionSequence`. Fields: `decision: "ACCEPT" | "MODIFY" | "REJECT" | "DEFER" | "RELEASE"`, `recommendedQty`, `decidedQty`, `deferUntilWeek`, `reasonCode`, `comment`, `actorUserId`, `actedAt`, `createdPoNumber`, `workflowId`, and provenance. Seed a decision only after its recommendation. Status uses `u("reorder-decision|"+naturalKey)`, but `RELEASE` is legal only after accept/modify and must reference a generated PO whose quantity and need date match the final decision.

### Inventory scenarios and health observations

`inventory_scenario_versions` grain/key: `inventoryScenarioVersionId`. Fields: `scenarioVersionId`, `baselineInventorySnapshotId`, `baselineForecastVersionId`, `policyVersionId`, `assumptionSetId`, `ownerUserId`, `status`, `createdAt`, `publishedAt`, and provenance. Child `inventory_scenario_lines` grain: version x SKU x location x week, with `openingQty`, `receiptsQty`, `demandQty`, `fulfilledQty`, `lostDemandQty`, `closingQty`, `dos`, and source IDs. Apply the same inventory identity as consensus-plan lines. The existing 12-week UI is a slice of these stored results.

`inventory_health_observations` grain/unique key: `skuId x locationId x weekId x inventorySnapshotVersionId`. Fields: `onHandQty`, `availableQty`, `inTransitQty`, `dos`, `policyMinDos`, `policyMaxDos`, `stockoutFlag`, `excessFlag`, `slowMovingFlag`, `obsoleteQty`, `exposurePaise`, `status`, `firstObservedWeek`, `consecutiveWeeks`, `closedWeek`, and source IDs. `dos = available/max(meanDailyDemand,1)`; stockout when available is zero or projected demand before next receipt exceeds available; excess when DOS exceeds max; slow-moving when trailing-13-week turns fall below policy; obsolete quantity comes only from batch aging. Observations contain no noise and are append-only so recurrence and closure are provable.

### Inventory batches and aging

`inventory_batches` grain/key: `batchId x locationId`. Fields: `skuId`, `sourceReceiptId`, `supplierId`, `manufacturedDate`, `receivedDate`, `expiryDate`, `originalQty`, `availableQty`, `reservedQty`, `unitCostPaise`, `currency: "INR"`, `lotStatus`, and provenance. `inventory_batch_movements` grain/key: `movementId`; fields `batchId`, `locationId`, `movementType`, `quantity`, `eventAt`, `sourceEntityType`, `sourceEntityId`, and idempotency key.

Dates derive from the receipt: `manufacturedDate = receivedDate - (3 + floor(18u(stableKey))) days`; expiry is null for non-expiring durable devices unless a configured battery/accessory shelf-life applies. `ageDays = anchorDate-receivedDate`; slow-moving and obsolete thresholds come from the effective inventory policy/category rule, never a random flag. `exposurePaise = obsoleteQty * unitCostPaise`.

## 8. Scenario and cross-module assumption entities

### Scenario versions, assumptions, outputs, and audit

Keep `what_if_scenarios` as the logical scenario header and add explicit versions.

`scenario_versions` grain/key: `scenarioVersionId`. Fields: `scenarioId`, `versionNo`, `name`, `baselinePlanVersionId`, `calendarVersionId`, `assumptionSetId`, `ownerUserId`, `status: "DRAFT" | "RUNNING" | "REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED"`, `createdAt`, `runAt`, `approvedAt`, `publishedAt`, `workflowId`, `parentScenarioVersionId`, and provenance.

`scenario_assumption_sets` grain/key: `assumptionSetId`; child grain `assumptionSetId x assumptionCode x scopeType x scopeId x effectiveWeek`. Fields: `domain: "DEMAND" | "CAPACITY" | "INVENTORY" | "PROCUREMENT" | "FINANCE"`, `value`, `unit`, `operator`, `lowerBound`, `upperBound`, `scope`, `effectiveFromWeek`, `effectiveToWeek`, `priority`, `source`, and comment. Seed named levers such as demand uplift, channel mix, supplier delay days, line-capacity delta, lead-time delta, service-level change, net-price change, and unit-cost change. Values use reviewed ranges with FNV noise keyed by scenario and lever; module-local sliders must read/write these rows.

`scenario_output_lines` grain/unique key: `scenarioVersionId x skuId x channelId x locationId x weekId`. Fields: `baselineDemandQty`, `scenarioDemandQty`, `baselineSupplyQty`, `scenarioSupplyQty`, `openingInventoryQty`, `closingInventoryQty`, `unmetDemandQty`, `revenuePaise`, `grossMarginPaise`, `costVariancePaise`, `capacityGapQty`, and source IDs. Generation applies assumptions in priority order to the same baseline versions, then runs demand, supply, inventory, and finance identities once. Summary outcomes are exact aggregates of these lines.

Scenario changes and publication use `entity_audit_events`; approval uses `workflow_instances`/`workflow_steps`. A published version is immutable, and no scenario may reference a baseline newer than its own creation time.

## 9. Financial planning entities

### Budget and target facts

`financial_plan_versions` grain/key: `financialPlanVersionId`. Fields: `name`, `fiscalYear`, `scenarioVersionId`, `status: "WORKING" | "APPROVED" | "LOCKED"`, `ownerUserId`, `approvedAt`, `lockedAt`, `currency: "INR"`, and provenance.

`budget_targets` grain/unique key: `financialPlanVersionId x skuId x channelId x periodId x measureCode`. Fields: `categoryCode`, `regionId`, `measureCode: "UNITS" | "NET_REVENUE" | "GROSS_MARGIN" | "COLLECTION"`, `targetValue`, `unit`, `targetAmountPaise`, `currency: "INR"`, `sourceAssumptionSetId`, `ownerUserId`, and provenance. Seed unit targets from the approved demand baseline with category growth `0.04..0.18` keyed by category/year; revenue is `unitTarget * plannedNetPricePaise`; margin is revenue less stored product, scheme, freight, and duty cost. Channel/category targets are sums of stored leaf rows, never separately randomized. Actual-vs-budget and forecast-vs-budget read models join by exact version and business key.

### Invoices, receivables, and collections

`customer_invoices` grain/key: `invoiceId`; line grain `invoiceId x invoiceLineId`. Header fields: `distributorId`, `orderId`, `invoiceDate`, `dueDate`, `paymentTermsDays`, `grossAmountPaise`, `discountPaise`, `taxPaise`, `netAmountPaise`, `currency: "INR"`, `status`, `sourceRunId`, and provenance. Line fields: `skuId`, `quantity`, `unitNetPricePaise`, `schemeId`, `lineNetAmountPaise`, and `asnLineId`. Amounts reconcile exactly: `net = gross-discount+tax`.

`cash_receipts` grain/key: `receiptId`; allocation grain `receiptId x invoiceId`. Fields: `distributorId`, `receivedDate`, `amountPaise`, `paymentMethod`, `bankReference`, `status`, `sourceRunId`; allocation fields `allocatedAmountPaise`, `writeOffPaise`, `discountTakenPaise`. Total allocations cannot exceed the receipt, and cumulative invoice allocation cannot exceed invoice net amount.

`receivable_snapshots` grain/unique key: `invoiceId x asOfDate x dataVersion`. Fields: `distributorId`, `dueDate`, `originalAmountPaise`, `paidToDatePaise`, `openAmountPaise`, `daysPastDue`, `agingBucket: "CURRENT" | "1_30" | "31_60" | "61_90" | "90_PLUS"`, `currency: "INR"`, and source IDs. `open = max(0, original-paid-writeOff-discountTaken)`; `daysPastDue = max(0, asOfDate-dueDate)`; the bucket is a deterministic interval lookup. Seed invoice timing from fulfilled ASNs and collection timing from effective distributor terms plus `round(signed("collection-delay|"+invoiceId,12))` days. These facts feed distributor credit snapshots and replace percentage-only cashflow assumptions.

## 10. Chatbot grounding and evidence entities

`assistant_grounding_traces` grain/key: `traceId`; unique association `sessionId x assistantMessageId`. Fields: `userMessageId`, `intentCode`, `requestedAt`, `answeredAt`, `model`, `modelVersion`, `promptTemplateVersion`, `dataVersion`, `calendarVersionId`, `sourceEntityRefs`, `sourceVersionIds`, `insightIds`, `toolCalls`, `inputTokenCount`, `outputTokenCount`, `latencyMs`, `status: "SUCCESS" | "PARTIAL" | "ERROR"`, `errorCode`, `errorDetail`, `responseHashFNV1a`, and retention/provenance fields.

Persist the trace in the same transaction as the assistant message. `responseHashFNV1a` is the FNV-1a hash of canonical response text and cited card IDs; it is integrity metadata, not randomness. Seed representative traces only for existing seeded sessions: source references must resolve to versions whose effective time is at or before `answeredAt`; `inputTokenCount = max(1,round(canonicalPromptCharacters/4))`, `outputTokenCount = max(1,round(responseCharacters/4))`, and `latencyMs = 450 + floor(2200u("chat-latency|"+traceId))`. Errors must not have fabricated insight references.

## 11. Generation order, integrity, and gap coverage

Generate in dependency order without reseeding: calendar/version -> identities and masters -> SKU lifecycle/NPI -> partners/lines/listings/policies -> events/schemes/assumptions -> weekly actuals and execution facts -> forecast vintages -> accuracy -> capacity/supply/inventory/scenario/financial derived facts -> workflows/audits -> KPI observations/notifications/reports/chat traces. Sort every parent set by its stable business key before consuming the existing Mulberry32 stream. Use FNV-1a stable keys for per-entity noise so editing one entity does not perturb another.

Required integrity checks:

- Every foreign key resolves to an effective parent version; natural-key uniqueness holds at the grains stated above.
- All 26-week module views join through one `calendarVersionId` and explicit `weekId`; no arrays are aligned by position.
- The 157-week retained feature window is used only where DR0 requires full history/backtesting, NPI/festive coverage, lifecycle history, or 27-52-week planning. Default operational screens remain 26 buckets.
- No NPI actual exists before launch; no forecast-accuracy row exists before its actual closes; both forecast and actual are copied into each immutable accuracy row.
- Lifecycle method selection comes from the effective per-SKU product-master field. NEW uses ramp, not seasonality.
- `demand_events` is the only promotion-week input to forecasting. No hardcoded promotion-week list remains authoritative.
- Partner capacity reconciles from lines and capacity buckets; reliability reconciles from POs and inspections.
- PO planned and actual handover dates remain distinct; exclusions have approved reason-coded intervals and never silently rewrite adherence history.
- Workflow steps are sequential, every mutation appends `entity_audit_events`, and Demand/Production use the same workflow and audit schemas.
- Quantity, inventory, invoice, receipt, capacity, and monetary identities reconcile exactly after rounding; every monetary record is INR.

Together, Sections 2-10 cover every entity marked `N` in `DATA_GAPS.md`: shared calendar versions; KPI registry/history; identity/RBAC; notifications; reports; forecast vintages/accuracy; feed runs; lifecycle transitions; NPI readiness; event templates; workflow steps; market benchmarks; factor proposals; order audit; schemes; credit; dealers and sell-through; ASN/dispatch evidence; capacity plans; production/OEE and quality evidence; capacity expansion; import and transfer milestones; official consensus-plan versions/lines; reorder decisions; inventory scenario/history/batches; scenario versions/shared assumptions; budgets; receivables; and chatbot grounding. The explicitly requested existing ODM/EMS, PO, lifecycle, event, channel-norm, NPI, workflow, and accuracy entities are also fully specified here so implementation has one contract.
