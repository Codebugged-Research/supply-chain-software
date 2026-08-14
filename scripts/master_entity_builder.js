const DATA_VERSION = 'DM-2026-W33-V1'
const GENERATION_SEED = 20250701
const CALENDAR_VERSION = 'CAL-2026-W33-V1'
const ANCHOR = new Date('2026-08-10T00:00:00.000Z')

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const round = (value, digits = 0) => Math.round(value * 10 ** digits) / 10 ** digits
const iso = (date) => new Date(date).toISOString()
const dateOnly = (date) => iso(date).slice(0, 10)
const addDays = (date, days) => new Date(new Date(date).getTime() + days * 86400000)
const provenance = (source = 'SEED') => ({ source, dataVersion: DATA_VERSION, generationSeed: GENERATION_SEED })

function buildMasterEntities(dataset, stableUnit01) {
  const u = stableUnit01
  const signed = (key, amplitude) => (2 * u(key) - 1) * amplitude
  const pick = (key, values) => values[Math.min(values.length - 1, Math.floor(u(key) * values.length))]
  const weeks = dataset.planningWeeks
  const closedWeeks = weeks.filter((week) => week.isClosed)
  const operationalWeeks = weeks.filter((week) => week.weekIndex >= -25 && week.weekIndex <= 0)
  const forwardWeeks = weeks.filter((week) => week.weekIndex >= 0 && week.weekIndex <= 25)
  const weekById = new Map(weeks.map((week) => [week.weekId, week]))
  const actualByKey = new Map(dataset.weekly.map((row) => [`${row.skuId}|${row.distributorId}|${row.weekId}`, row]))
  const partnerLines = dataset.manufacturingPartnerLines
  const purchaseOrders = dataset.purchaseOrders

  const planningCalendarVersions = [{
    calendarVersionId: CALENDAR_VERSION, label: 'S&OP Calendar 2026 W33', anchorWeekId: '2026-W33', historyWeeks: 104,
    futureWeeks: 52, defaultViewWeeks: 26, timezone: 'Asia/Kolkata', weekStartsOn: 'MONDAY', status: 'ACTIVE',
    effectiveAt: iso(ANCHOR), createdAt: iso(ANCHOR), updatedAt: iso(ANCHOR), ...provenance(),
  }]
  const planningWeeks = weeks.map((week) => {
    const start = new Date(`${week.weekStart}T00:00:00.000Z`)
    const fiscalMonth = start.getUTCMonth() + 1
    return {
      calendarVersionId: CALENDAR_VERSION, weekId: week.weekId, weekIndex: week.weekIndex, startDate: week.weekStart,
      endDate: dateOnly(addDays(start, 6)), fiscalYear: start.getUTCFullYear(), fiscalQuarter: `Q${Math.ceil(fiscalMonth / 3)}`,
      fiscalMonth, isClosed: week.isClosed, isAnchor: week.isAnchor, isDefault26WeekView: week.isDefault26WeekView,
      festiveLabel: dataset.demandEvents.find((event) => week.weekId >= event.startWeek && week.weekId <= event.endWeek)?.name || null,
      ...provenance(),
    }
  })

  const lifecycleTransitionHistory = dataset.skus.map((sku) => ({
    transitionId: `PLC-${sku.id}-${sku.lifecycleStageSinceWeek}`, skuId: sku.id, oldStage: null, newStage: sku.lifecycleStage,
    effectiveWeek: sku.lifecycleStageSinceWeek, effectiveToWeek: null, actorUserId: 'category.manager@boat.com', actorRole: 'Category Manager',
    reasonCode: 'INITIAL_CLASSIFICATION', comment: 'Deterministic lifecycle master initialization',
    occurredAt: iso(addDays(ANCHOR, -(1 + Math.floor(60 * u(`plc-transition|${sku.id}`))))), ...provenance(),
  }))
  const npiProducts = dataset.npiForecasts.map((row) => ({
    npiId: row.npiId, skuId: row.skuId, productName: row.productName || row.skuName, category: row.category,
    subCategory: row.subCategory, launchWeek: row.launchWeek, rampWeeks: row.rampWeeks, rampCurve: row.rampCurve || row.curveTemplate,
    analogSkuIds: row.analogSkuIds || [row.analogSkuId].filter(Boolean), targetPeakWeeklyUnits: row.targetPeakWeeklyUnits || row.peakWeeklyUnits,
    mrpPaise: Math.round((row.mrp || row.price || 1999) * 100), plannedNetPricePaise: Math.round((row.plannedNetPrice || row.price || 1499) * 100),
    unitCostPaise: Math.round((row.unitCost || 700) * 100), currency: 'INR', lifecycleStage: 'NEW', hasSalesHistory: false,
    readinessPct: round((row.readinessPct || 0) / (row.readinessPct > 1 ? 100 : 1), 4), cannibalizedSkuIds: row.cannibalizedSkuIds || [],
    status: row.status || 'PLANNED', ownerUserId: 'npi.manager@boat.com', effectiveFromWeek: '2026-W33', effectiveToWeek: null,
    version: 1, createdAt: iso(addDays(ANCHOR, -28)), updatedAt: iso(ANCHOR), ...provenance(),
  }))
  const npiReadinessItems = dataset.npiReadinessItems.map((row) => ({ ...row, ...provenance(row.source || 'SEED') }))
  const eventTemplates = dataset.eventTemplates.map((row) => ({ ...row, ...provenance(row.source || 'SEED') }))
  const channelInventoryNorms = dataset.inventoryNorms.map((row) => ({ ...row, ...provenance(row.source || 'SEED') }))

  const proposalForecasts = dataset.forecastVintages.filter((row) => row.horizonWeeks === 4).slice(0, 12)
  const factorAdjustedDemandProposals = [0, 1, 2].map((index) => {
    const lines = proposalForecasts.slice(index * 4, index * 4 + 4).map((forecast) => {
      const eventRate = round(signed(`factor-event|${forecast.forecastId}`, 0.12), 4)
      const priceRate = round(signed(`factor-price|${forecast.forecastId}`, 0.08), 4)
      const marketRate = round(signed(`factor-market|${forecast.forecastId}`, 0.06), 4)
      const netRate = clamp(eventRate + priceRate + marketRate, -0.4, 0.75)
      const proposedQty = Math.max(0, Math.round(forecast.forecastQty * (1 + netRate)))
      return {
        forecastId: forecast.forecastId, baseQty: forecast.forecastQty,
        factorIds: ['EVENT', 'PRICE', 'MARKET'], individualAdjustments: { EVENT: eventRate, PRICE: priceRate, MARKET: marketRate },
        netAdjustmentQty: proposedQty - forecast.forecastQty, proposedQty,
      }
    })
    return {
      proposalId: `FDP-2026-W33-${index + 1}`, sourceForecastVersionId: 'FCST-2026-W33-V1', scenarioVersionId: null,
      status: index === 0 ? 'APPROVED' : index === 1 ? 'SUBMITTED' : 'DRAFT', authorUserId: 'demand.planner@boat.com',
      submittedAt: iso(addDays(ANCHOR, -5 + index)), approvedAt: index === 0 ? iso(addDays(ANCHOR, -3)) : null,
      comment: 'Stored factor proposal; baseline vintage remains immutable', lines, ...provenance(),
    }
  })

  const consensusPlanVersions = [{
    planVersionId: 'CPV-2026-W33-V1', calendarVersionId: CALENDAR_VERSION, sourceScenarioVersionId: 'SCV-BASELINE-V1',
    demandForecastVersionId: 'FCST-2026-W33-V1', workflowId: dataset.consensusProductionPlans[0].workflowId,
    name: 'Official S&OP Consensus Plan W33', status: 'APPROVED', ownerUserId: 'sop.lead@boat.com',
    approvedAt: iso(addDays(ANCHOR, -1)), lockedThroughWeek: '2026-W37', publishedAt: null, ...provenance(),
  }]
  const consensusPlanLines = []
  dataset.skus.forEach((sku) => {
    let opening = Math.round(sku.baseWeekly * 2.2)
    forwardWeeks.forEach((week) => {
      const demand = Math.max(0, Math.round(sku.baseWeekly * (1 + signed(`consensus-demand|${sku.id}|${week.weekId}`, 0.15))))
      const production = Math.max(0, Math.round(demand * (0.9 + 0.18 * u(`consensus-production|${sku.id}|${week.weekId}`))))
      const purchase = Math.max(0, Math.round(demand * 0.1 * u(`consensus-purchase|${sku.id}|${week.weekId}`)))
      const available = opening + production + purchase
      const fulfilled = Math.min(demand, available)
      const closing = Math.max(0, available - fulfilled)
      consensusPlanLines.push({
        planVersionId: 'CPV-2026-W33-V1', skuId: sku.id, weekId: week.weekId, channelDemandQty: demand,
        consensusDemandQty: demand, plannedProductionQty: production, plannedPurchaseQty: purchase,
        plannedTransferInQty: 0, plannedTransferOutQty: 0, openingInventoryQty: opening, closingInventoryQty: closing,
        unmetDemandQty: Math.max(0, demand - available), capacityGapQty: Math.max(0, demand - production),
        isLocked: week.weekIndex <= 4, sourceForecastVersionId: 'FCST-2026-W33-V1', ...provenance(),
      })
      opening = closing
    })
  })

  const users = [
    ['demand.planner@boat.com', 'Devika Rao', 'Demand Planning', 'Demand Planner', 'DEMAND_PLANNER'],
    ['supply.planner@boat.com', 'Samar Iyer', 'Supply Planning', 'Supply Planner', 'SUPPLY_PLANNER'],
    ['category.manager@boat.com', 'Kavya Mehta', 'Category', 'Category Manager', 'CATEGORY_MANAGER'],
    ['sales.manager@boat.com', 'Arjun Nair', 'Sales', 'Sales Head', 'SALES_HEAD'],
    ['finance.controller@boat.com', 'Rhea Kapoor', 'Finance', 'Finance Controller', 'FINANCE'],
    ['sop.lead@boat.com', 'Nikhil Shah', 'S&OP', 'S&OP Lead', 'SOP_LEAD'],
    ['npi.manager@boat.com', 'Meera Joshi', 'NPI', 'NPI Manager', 'NPI_MANAGER'],
    ['procurement.manager@boat.com', 'Kabir Singh', 'Procurement', 'Procurement Manager', 'PROCUREMENT'],
    ['plant.manager@boat.com', 'Ananya Pillai', 'Manufacturing', 'Plant Manager', 'PLANT'],
    ['inventory.planner@boat.com', 'Ishaan Verma', 'Inventory', 'Inventory Planner', 'INVENTORY_PLANNER'],
    ['system.seed@boat.com', 'S&OP Seed Service', 'Platform', 'System Account', 'SYSTEM'],
  ].map(([email, displayName, department, title, defaultRole]) => ({
    userId: email, displayName, email, department, title, status: 'ACTIVE', defaultRole,
    createdAt: iso(addDays(ANCHOR, -365)), ...provenance(),
  }))
  const roleAssignments = users.map((user, index) => ({
    assignmentId: `ROLE-${String(index + 1).padStart(3, '0')}`, userId: user.userId, roleCode: user.defaultRole,
    scopeType: 'ENTERPRISE', scopeIds: ['BOAT-INDIA'], effectiveFrom: '2026-01-01', effectiveTo: null,
    grantedBy: 'system.seed@boat.com', status: 'ACTIVE', ...provenance(),
  }))

  const kpiDefinitions = [
    ['FILL_RATE', 'Fill Rate', 'ORDER', 'RATIO', 'fulfilledQty', 'orderedQty', 'PERCENT', 'HIGHER'],
    ['FORECAST_WAPE', 'Forecast WAPE', 'DEMAND', 'WAPE', 'absoluteErrorQty', 'actualQty', 'PERCENT', 'HIGHER'],
    ['FORECAST_BIAS', 'Forecast Bias', 'DEMAND', 'BIAS', 'signedErrorQty', 'actualQty', 'PERCENT', 'CENTER'],
    ['INVENTORY_DOS', 'Inventory DOS', 'INVENTORY', 'DOS', 'availableQty', 'meanDailyDemand', 'DAYS', 'CENTER'],
    ['STOCKOUT_RATE', 'Stockout Rate', 'INVENTORY', 'RATIO', 'stockoutCount', 'skuLocationCount', 'PERCENT', 'LOWER'],
    ['CAPACITY_UTILIZATION', 'Capacity Utilization', 'SUPPLY', 'RATIO', 'allocatedProductionQty', 'availableCapacityQty', 'PERCENT', 'CENTER'],
    ['SUPPLIER_OTD', 'Supplier OTD', 'PROCUREMENT', 'RATIO', 'onTimePoCount', 'eligiblePoCount', 'PERCENT', 'HIGHER'],
    ['PO_HANDOVER_ADHERENCE', 'PO Handover Adherence', 'PROCUREMENT', 'RATIO', 'onTimePoCount', 'eligiblePoCount', 'PERCENT', 'HIGHER'],
    ['OEE', 'Overall Equipment Effectiveness', 'PRODUCTION', 'OEE', 'goodQty', 'plannedQty', 'PERCENT', 'HIGHER'],
    ['REVENUE', 'Net Revenue', 'FINANCE', 'SUM', 'netAmountPaise', null, 'INR_PAISE', 'HIGHER'],
    ['GROSS_MARGIN', 'Gross Margin', 'FINANCE', 'SUM', 'grossMarginPaise', null, 'INR_PAISE', 'HIGHER'],
    ['CASH_COLLECTION', 'Cash Collection', 'FINANCE', 'SUM', 'amountPaise', null, 'INR_PAISE', 'HIGHER'],
    ['NPI_READINESS', 'NPI Readiness', 'NPI', 'RATIO', 'completedWeight', 'requiredWeight', 'PERCENT', 'HIGHER'],
  ].map(([kpiCode, name, module, formulaCode, numeratorMeasure, denominatorMeasure, unit, direction]) => ({
    kpiCode, effectiveFromWeek: '2026-W01', name, module, description: `${name} persisted KPI definition`, formulaCode,
    numeratorMeasure, denominatorMeasure, unit, aggregation: formulaCode === 'SUM' ? 'SUM' : 'RATIO', direction,
    greenThreshold: direction === 'LOWER' ? 0.03 : 0.9, amberThreshold: direction === 'LOWER' ? 0.07 : 0.8,
    ownerRole: module === 'FINANCE' ? 'FINANCE' : 'SOP_LEAD', visibleRoles: ['SOP_LEAD', 'DEMAND_PLANNER', 'SUPPLY_PLANNER'],
    sourceEntityTypes: [module], effectiveToWeek: null, version: 1, status: 'ACTIVE', createdAt: iso(ANCHOR), updatedAt: iso(ANCHOR), ...provenance(),
  }))
  const kpiObservations = kpiDefinitions.flatMap((definition) => operationalWeeks.map((week) => {
    const base = definition.direction === 'LOWER' ? 0.02 : definition.unit === 'DAYS' ? 18 : definition.unit === 'INR_PAISE' ? 850000000 : 0.9
    const value = definition.unit === 'INR_PAISE'
      ? Math.round(base * (0.85 + 0.3 * u(`kpi|${definition.kpiCode}|${week.weekId}`)))
      : round(Math.max(0, base * (0.9 + 0.2 * u(`kpi|${definition.kpiCode}|${week.weekId}`))), 4)
    const target = definition.unit === 'DAYS' ? 21 : definition.unit === 'INR_PAISE' ? 900000000 : definition.direction === 'LOWER' ? 0.03 : 0.9
    const status = definition.direction === 'LOWER' ? (value <= definition.greenThreshold ? 'GREEN' : value <= definition.amberThreshold ? 'AMBER' : 'RED') : (value >= definition.greenThreshold ? 'GREEN' : value >= definition.amberThreshold ? 'AMBER' : 'RED')
    return {
      kpiCode: definition.kpiCode, scopeType: 'ENTERPRISE', scopeId: 'BOAT-INDIA', weekId: week.weekId, value,
      numerator: value, denominator: definition.aggregation === 'RATIO' ? 1 : null, target, status,
      sourceVersionIds: [DATA_VERSION], computedAt: iso(addDays(new Date(`${week.weekStart}T00:00:00.000Z`), 7)), isFinal: week.isClosed, ...provenance('DERIVED'),
    }
  }))

  const notificationSubscriptions = users.slice(0, 6).map((user, index) => ({
    subscriptionId: `NSUB-${String(index + 1).padStart(3, '0')}`, userId: user.userId, roleCode: user.defaultRole,
    eventType: pick(`subscription-event|${user.userId}`, ['WORKFLOW_DUE', 'KPI_BREACH', 'PO_DELAY']), scope: { type: 'ENTERPRISE', ids: ['BOAT-INDIA'] },
    channel: index % 2 ? 'EMAIL' : 'IN_APP', minimumSeverity: index % 3 ? 'WARNING' : 'INFO', active: true,
    effectiveFromWeek: '2026-W01', effectiveToWeek: null, version: 1, status: 'ACTIVE', createdAt: iso(addDays(ANCHOR, -60)), updatedAt: iso(ANCHOR), ...provenance(),
  }))

  const integrationRuns = dataset.distributors.flatMap((distributor) => operationalWeeks.filter((_, index) => index % 4 === 0).map((week, index) => {
    const runId = `RUN-${distributor.id}-${week.weekId}`
    const expectedRows = dataset.skus.length
    const loss = Math.floor(expectedRows * Math.max(0, signed(`feed-loss|${runId}`, 0.018)))
    const failed = u(`feed-fail|${runId}`) < 0.025
    const receivedRows = failed ? 0 : expectedRows - loss
    const acceptedRows = Math.max(0, receivedRows - (u(`feed-reject|${runId}`) < 0.08 ? 1 : 0))
    const scheduled = new Date(`${week.weekStart}T02:00:00.000Z`)
    return {
      runId, integrationId: `INT-${distributor.id}`, sourceSystem: distributor.tier === 'C' ? 'MANUAL_UPLOAD' : 'CHANNEL_ERP', feedType: 'SELL_THROUGH',
      scheduledFor: iso(scheduled), startedAt: iso(addDays(scheduled, 0)), endedAt: iso(new Date(scheduled.getTime() + 12 * 60000)),
      status: failed ? 'FAILED' : acceptedRows === expectedRows ? 'SUCCESS' : 'PARTIAL', sourceFile: `${runId}.csv`,
      sourceChecksumFNV1a: Math.floor(u(`checksum|${runId}`) * 0xffffffff).toString(16).padStart(8, '0'), expectedRows, receivedRows,
      acceptedRows, rejectedRows: receivedRows - acceptedRows, firstPeriod: week.weekId, lastPeriod: week.weekId,
      gapPeriods: acceptedRows === expectedRows ? [] : [week.weekId], errorCode: failed ? 'SOURCE_UNAVAILABLE' : acceptedRows < expectedRows ? 'ROW_REJECTED' : null,
      errorDetail: failed ? 'Synthetic source outage' : null, ...provenance(),
    }
  }))

  const marketBrands = { 'TWS Earbuds': 'Boult', Neckbands: 'realme', Smartwatches: 'Noise', 'Portable Speakers': 'JBL', 'Wired Audio': 'Fire-Boltt' }
  const marketBenchmarkFacts = dataset.skus.flatMap((sku) => operationalWeeks.filter((_, index) => index % 4 === 0).flatMap((week) => ['NET_PRICE', 'RATING', 'SHARE_INDEX', 'PROMO_DEPTH'].map((measure) => {
    const key = `benchmark|${sku.id}|${week.weekId}|${measure}`
    const value = measure === 'NET_PRICE' ? Math.round(clamp(sku.price * (0.8 + 0.55 * u(key)), sku.cost * 1.05, sku.price * 1.4) / 100) * 100
      : measure === 'RATING' ? round(3.6 + u(key), 2) : measure === 'PROMO_DEPTH' ? round(0.05 + 0.35 * u(key), 4) : round(60 + 80 * u(key), 2)
    return {
      benchmarkId: `BM-${sku.id}-${week.weekId}-${measure}`, brand: marketBrands[sku.category] || 'Noise', category: sku.category,
      analogueCode: `ANLG-${sku.id}`, analogueSkuName: `${marketBrands[sku.category] || 'Noise'} ${sku.category} Comparable`, weekId: week.weekId,
      measure, value, unit: measure === 'NET_PRICE' ? 'INR' : measure === 'PROMO_DEPTH' ? 'RATE' : 'INDEX', currency: measure === 'NET_PRICE' ? 'INR' : null,
      sourceId: 'SYNTHETIC-PANEL-01', sourceType: 'SYNTHETIC_MARKET_PANEL', observedAt: `${week.weekStart}T12:00:00.000Z`, confidence: round(0.75 + 0.2 * u(`confidence|${key}`), 4), ...provenance(),
    }
  })))

  const commercialSchemes = dataset.demandEvents.filter((event) => event.status !== 'CANCELLED').slice(0, 6).map((event, index) => {
    const discountPct = round(0.05 + 0.13 * u(`scheme-discount|${event.eventId}`), 4)
    const perUnitFundingPaise = Math.round(2500 + 7500 * u(`scheme-funding|${event.eventId}`))
    const forecastUnits = Math.round(dataset.skus.reduce((sum, sku) => sum + sku.baseWeekly, 0) * Math.max(1, (weekById.get(event.endWeek)?.weekIndex || 0) - (weekById.get(event.startWeek)?.weekIndex || 0) + 1))
    return {
      schemeId: `SCH-${event.eventId}`, version: 1, name: `${event.name} Channel Scheme`, schemeType: index % 2 ? 'PER_UNIT_REBATE' : 'DISCOUNT',
      startWeek: event.startWeek, endWeek: event.endWeek, eligibleDistributorIds: dataset.distributors.map((row) => row.id), eligibleDealerTiers: ['A', 'B'],
      skuIds: event.skuIds || [], categories: event.categories || [], minOrderQty: 100, discountPct, perUnitFundingPaise,
      manufacturerFundingPct: 0.7, channelFundingPct: 0.3, budgetPaise: forecastUnits * perUnitFundingPaise,
      consumedBudgetPaise: Math.round(forecastUnits * perUnitFundingPaise * 0.45), currency: 'INR', status: 'APPROVED', eventId: event.eventId,
      ownerUserId: 'sales.manager@boat.com', approvedBy: 'finance.controller@boat.com', effectiveFromWeek: event.startWeek, effectiveToWeek: event.endWeek,
      createdAt: iso(addDays(ANCHOR, -45 + index)), updatedAt: iso(ANCHOR), ...provenance(),
    }
  })

  const distributorCreditAccounts = dataset.distributors.map((distributor) => {
    const tierBase = { A: 5000000000, B: 3000000000, C: 1500000000 }[distributor.tier]
    return {
      distributorId: distributor.id, effectiveFrom: '2026-01-01', creditLimitPaise: Math.round(tierBase * (0.85 + 0.3 * u(`credit-limit|${distributor.id}`))),
      paymentTermsDays: distributor.tier === 'A' ? 45 : distributor.tier === 'B' ? 30 : 21, riskClass: distributor.tier,
      temporaryLimitPaise: 0, temporaryLimitExpiry: null, blocked: false, blockReason: null, currency: 'INR',
      effectiveTo: null, version: 1, status: 'ACTIVE', createdAt: iso(addDays(ANCHOR, -180)), updatedAt: iso(ANCHOR), ...provenance(),
    }
  })

  const cityByDistributor = {
    'DST-001': ['Delhi', 'Noida', 'Gurugram'], 'DST-002': ['Mumbai', 'Pune', 'Nashik'], 'DST-003': ['Jaipur', 'Lucknow', 'Chandigarh'],
    'DST-004': ['Bengaluru', 'Chennai', 'Hyderabad'], 'DST-005': ['Ahmedabad', 'Surat', 'Vadodara'],
    'DST-006': ['Kolkata', 'Bhubaneswar', 'Patna'], 'DST-007': ['Nagpur', 'Indore', 'Raipur'], 'DST-008': ['Guwahati', 'Shillong', 'Agartala'],
  }
  const stateByCity = { Delhi: 'Delhi', Noida: 'Uttar Pradesh', Gurugram: 'Haryana', Mumbai: 'Maharashtra', Pune: 'Maharashtra', Nashik: 'Maharashtra', Jaipur: 'Rajasthan', Lucknow: 'Uttar Pradesh', Chandigarh: 'Chandigarh', Bengaluru: 'Karnataka', Chennai: 'Tamil Nadu', Hyderabad: 'Telangana', Ahmedabad: 'Gujarat', Surat: 'Gujarat', Vadodara: 'Gujarat', Kolkata: 'West Bengal', Bhubaneswar: 'Odisha', Patna: 'Bihar', Nagpur: 'Maharashtra', Indore: 'Madhya Pradesh', Raipur: 'Chhattisgarh', Guwahati: 'Assam', Shillong: 'Meghalaya', Agartala: 'Tripura' }
  const suffixes = ['Mobile Hub', 'Digital World', 'Electronics Point', 'Gadget Gallery']
  const dealers = dataset.distributors.flatMap((distributor) => Array.from({ length: 10 }, (_, index) => {
    const city = cityByDistributor[distributor.id][index % 3]
    return {
      dealerId: `DLR-${distributor.id}-${String(index + 1).padStart(3, '0')}`, dealerName: `${city} ${suffixes[index % suffixes.length]} ${index + 1}`,
      distributorId: distributor.id, dealerTier: index < 3 ? 'A' : index < 7 ? 'B' : 'C', channelType: index % 3 ? 'GENERAL_TRADE' : 'MODERN_TRADE',
      city, state: stateByCity[city], region: distributor.region, pinCode: String(110001 + Math.floor(700000 * u(`pin|${distributor.id}|${index}`))).padStart(6, '0'),
      latitude: round(8 + 22 * u(`lat|${distributor.id}|${index}`), 5), longitude: round(70 + 18 * u(`lon|${distributor.id}|${index}`), 5),
      onboardedWeek: closedWeeks[30 + index]?.weekId, active: true, listedCategoryCodes: [...new Set(dataset.skus.slice(index % 5, index % 5 + 6).map((sku) => sku.category))],
      closedWeek: null, ...provenance(),
    }
  }))
  const dealerSkuWeekly = []
  dealers.forEach((dealer, dealerIndex) => {
    const listedSkus = dataset.skus.slice(dealerIndex % 10, dealerIndex % 10 + 5)
    listedSkus.forEach((sku) => {
      let opening = Math.round(sku.baseWeekly / 30)
      operationalWeeks.forEach((week) => {
        const parent = actualByKey.get(`${sku.id}|${dealer.distributorId}|${week.weekId}`)
        const localDemand = Math.max(0, Math.round((parent?.tertiary || sku.baseWeekly) / 10))
        const receivedQty = Math.max(0, Math.round(localDemand * (0.75 + 0.5 * u(`dealer-receipt|${dealer.dealerId}|${sku.id}|${week.weekId}`))))
        const returnsQty = Math.round(localDemand * 0.01 * u(`dealer-return|${dealer.dealerId}|${sku.id}|${week.weekId}`))
        const sellThroughQty = Math.min(opening + receivedQty, Math.max(0, Math.round(localDemand * (0.88 + signed(`dealer-sale|${dealer.dealerId}|${sku.id}|${week.weekId}`, 0.12)))))
        const closingQty = Math.max(0, opening + receivedQty - sellThroughQty + returnsQty)
        dealerSkuWeekly.push({
          dealerId: dealer.dealerId, skuId: sku.id, weekId: week.weekId, openingQty: opening, receivedQty, sellThroughQty,
          returnsQty, closingQty, listed: true, inStockDays: Math.min(7, Math.round(7 * (opening + receivedQty > 0 ? 1 : 0))),
          activeSaleDays: sellThroughQty ? Math.max(1, Math.min(7, Math.round(sellThroughQty / Math.max(1, localDemand / 5)))) : 0,
          netSalesPaise: sellThroughQty * Math.round(sku.price * 100), sourceRunId: `RUN-${dealer.distributorId}-${week.weekId}`, ...provenance(),
        })
        opening = closingQty
      })
    })
  })

  const advanceShipNotices = purchaseOrders.filter((po) => po.status === 'CLOSED').slice(0, 10).map((po, index) => {
    const lines = (po.lines || []).map((line, lineIndex) => ({
      asnLineId: `ASNL-${index + 1}-${lineIndex + 1}`, orderLineId: line.poLineId, skuId: line.skuId,
      shippedQty: Math.min(line.orderedQty, line.handedOverQty || line.receivedQty || line.orderedQty), batchIds: [`BATCH-${po.poNumber}-${lineIndex + 1}`],
    }))
    return {
      asnId: `ASN-${po.poNumber}`, orderId: po.poNumber, warehouseId: po.receiveAtLocationId, carrierId: `CARRIER-${(index % 3) + 1}`,
      vehicleRef: `MH04AB${String(1200 + index)}`, sourceDocument: `EWAY-${po.poNumber}`, dispatchTimestamp: `${po.actualHandoverDate}T08:00:00.000Z`,
      expectedArrival: `${po.actualReceiptDate || po.promisedDeliveryDate}T18:00:00.000Z`, status: 'DELIVERED', sourceRunId: `RUN-ASN-${index + 1}`, lines, ...provenance(),
    }
  })
  const dispatchMilestones = advanceShipNotices.flatMap((asn) => ['ALLOCATED', 'PACKED', 'DISPATCHED', 'DELIVERED'].map((eventType, index) => ({
    milestoneId: `DSPM-${asn.asnId}-${index + 1}`, asnId: asn.asnId, orderId: asn.orderId, eventType,
    eventAt: iso(addDays(new Date(asn.dispatchTimestamp), index - 2)), locationId: asn.warehouseId,
    quantity: asn.lines.reduce((sum, line) => sum + line.shippedQty, 0), actorUserId: index < 2 ? 'supply.planner@boat.com' : 'system.seed@boat.com',
    sourceSystem: 'WMS', evidenceRef: `${asn.sourceDocument}-${eventType}`, reasonCode: null, ...provenance(),
  })))

  const capacityExpansionPlans = partnerLines.slice(0, 3).map((line, index) => ({
    expansionId: `CAPEX-${line.lineId}`, partnerId: line.partnerId, plantId: null, lineId: line.lineId,
    name: `${line.lineName} capacity debottlenecking`, approvalStatus: index === 0 ? 'COMMISSIONED' : index === 1 ? 'APPROVED' : 'PROPOSED',
    approvedWeek: index < 2 ? '2026-W20' : null, plannedCommissioningWeek: `2026-W${40 + index * 4}`,
    actualCommissioningWeek: index === 0 ? '2026-W30' : null,
    capacityDeltaUnitsPerWeek: Math.round(line.lineCapacityUnitsPerWeek * (0.15 + 0.2 * u(`capacity-expansion|${line.lineId}`)) / 1000) * 1000,
    capexPaise: Math.round(line.lineCapacityUnitsPerWeek * (0.15 + 0.2 * u(`capacity-expansion|${line.lineId}`))) * (8500 + Math.floor(5500 * u(`capex|${line.lineId}`))),
    currency: 'INR', ownerUserId: 'plant.manager@boat.com', sourceScenarioVersionId: 'SCV-CAPACITY-V1',
    createdAt: iso(addDays(ANCHOR, -90)), updatedAt: iso(ANCHOR), ...provenance(),
  }))
  const lineCapacityPlans = partnerLines.flatMap((line) => weeks.map((week) => {
    const maintenanceLossQty = u(`maintenance|${line.lineId}|${week.weekId}`) < 0.06 ? Math.round(line.lineCapacityUnitsPerWeek * (0.05 + 0.1 * u(`maintenance-loss|${line.lineId}|${week.weekId}`))) : 0
    const expansion = capacityExpansionPlans.find((row) => row.lineId === line.lineId && row.approvalStatus === 'COMMISSIONED' && week.weekId >= row.actualCommissioningWeek)
    const expansionGainQty = expansion?.capacityDeltaUnitsPerWeek || 0
    const contractedCapacityQty = Math.round(line.lineCapacityUnitsPerWeek * 0.78)
    const spotCapacityQty = line.lineCapacityUnitsPerWeek - contractedCapacityQty
    const npiReservedQty = line.npiCapable ? Math.round(contractedCapacityQty * 0.08) : 0
    const availableCapacityQty = Math.max(0, contractedCapacityQty + spotCapacityQty + expansionGainQty - maintenanceLossQty)
    const allocatedProductionQty = Math.min(availableCapacityQty, Math.round(availableCapacityQty * (0.68 + 0.3 * u(`capacity-allocation|${line.lineId}|${week.weekId}`))))
    return {
      capacityPlanVersionId: 'CAP-2026-W33-V1', lineId: line.lineId, weekId: week.weekId, partnerId: line.partnerId, plantId: null,
      ratedCapacityQty: line.lineCapacityUnitsPerWeek, contractedCapacityQty, spotCapacityQty, npiReservedQty,
      maintenanceLossQty, shutdownLossQty: 0, expansionGainQty, availableCapacityQty, allocatedProductionQty,
      remainingCapacityQty: Math.max(0, availableCapacityQty - allocatedProductionQty), utilizationRate: round(allocatedProductionQty / Math.max(availableCapacityQty, 1), 4),
      sourceExpansionIds: expansion ? [expansion.expansionId] : [], status: week.isClosed ? 'ACTUAL' : 'PLANNED', ...provenance(),
    }
  }))

  const productionExecutionEvents = lineCapacityPlans.filter((row) => row.weekId === '2026-W32').slice(0, 10).map((capacity, index) => {
    const plannedQty = Math.round(capacity.allocatedProductionQty / 4)
    const scheduledMinutes = 6 * 8 * 60
    const downtimeMinutes = Math.round(scheduledMinutes * Math.max(0, signed(`downtime|PROD-${index + 1}`, 0.08) + 0.04))
    const runMinutes = scheduledMinutes - downtimeMinutes
    const idealCycleSeconds = 12 + index
    const grossOutput = Math.floor(runMinutes * 60 / idealCycleSeconds)
    const rejectedQty = Math.round(grossOutput * (0.005 + 0.025 * u(`reject|PROD-${index + 1}`)))
    const reworkQty = Math.round(rejectedQty * 0.35)
    return {
      executionEventId: `PEX-2026-W32-${index + 1}`, productionOrderId: `PROD-2026-W32-${index + 1}`, lineId: capacity.lineId,
      eventStart: iso(addDays(ANCHOR, -7 + index / 24)), skuId: dataset.skus[index % dataset.skus.length].id,
      plannedQty, goodQty: Math.max(0, Math.min(plannedQty, grossOutput - rejectedQty + reworkQty)), rejectedQty, reworkQty,
      scheduledMinutes, runMinutes, downtimeMinutes, downtimeReasonCode: downtimeMinutes ? 'PLANNED_CHANGEOVER' : null,
      idealCycleSeconds, actualStart: iso(addDays(ANCHOR, -7 + index / 24)), actualEnd: iso(addDays(ANCHOR, -7 + index / 24 + runMinutes / 1440)),
      sourceTimestamp: iso(addDays(ANCHOR, -6)), sourceSystem: 'MES', ...provenance(),
    }
  })

  const importShipmentIds = ['IMP-RM-26081', 'IMP-FG-26076', 'IMP-RM-26083', 'IMP-FG-26069']
  const importEvents = ['BOOKED', 'SUPPLIER_HANDOVER', 'DEPARTED', 'ARRIVED_PORT', 'CUSTOMS_FILED', 'CUSTOMS_CLEARED', 'DC_RECEIVED']
  const importShipmentMilestones = importShipmentIds.flatMap((shipmentId, shipmentIndex) => importEvents.map((eventType, sequenceIndex) => {
    const plannedAt = addDays(ANCHOR, -35 + shipmentIndex * 3 + sequenceIndex * (shipmentIndex === 2 ? 2 : 5))
    const actualAt = addDays(plannedAt, Math.round(signed(`import-leg|${shipmentId}|${eventType}`, shipmentIndex === 2 ? 1 : 2)))
    return {
      milestoneId: `IMPM-${shipmentId}-${sequenceIndex + 1}`, importShipmentId: shipmentId, sequence: sequenceIndex + 1, eventType,
      plannedAt: iso(plannedAt), actualAt: iso(actualAt), portCode: shipmentIndex === 1 ? 'INNSA' : 'INMUN', locationId: sequenceIndex === 6 ? 'WH-NORTH-DELHI' : null,
      quantity: 12000 + shipmentIndex * 6000, actorUserId: 'procurement.manager@boat.com', sourceSystem: 'TMS',
      evidenceRef: `${shipmentId}-${eventType}`, delayReasonCode: actualAt > plannedAt ? 'CARRIER_DELAY' : null, ...provenance(),
    }
  }))
  const transferMilestones = Array.from({ length: 6 }, (_, transferIndex) => `TRF-202607-${7000 + transferIndex}`).flatMap((transferOrderId, transferIndex) => ['ALLOCATED', 'DISPATCHED', 'IN_TRANSIT', 'RECEIVED'].map((eventType, sequenceIndex) => {
    const dispatchedQty = transferIndex === 0 ? 1000 : 300
    const damagedQty = eventType === 'RECEIVED' ? Math.round(dispatchedQty * 0.01 * u(`transfer-damage|${transferOrderId}`)) : 0
    return {
      milestoneId: `TRFM-${transferOrderId}-${sequenceIndex + 1}`, transferOrderId, sequence: sequenceIndex + 1, eventType,
      eventAt: iso(addDays(ANCHOR, -12 + transferIndex + sequenceIndex * 1.5)), fromLocationId: 'WH-NORTH-DELHI', toLocationId: transferIndex % 2 ? 'WH-SOUTH-BLR' : 'WH-WEST-BHIWANDI',
      dispatchedQty: sequenceIndex >= 1 ? dispatchedQty : 0, receivedQty: eventType === 'RECEIVED' ? dispatchedQty - damagedQty : 0,
      carrierId: `CARRIER-${(transferIndex % 3) + 1}`, evidenceRef: `${transferOrderId}-${eventType}`, reasonCode: damagedQty ? 'DAMAGE' : null, ...provenance(),
    }
  }))

  const locations = dataset.distributors.map((row) => `LOC-${row.id}`)
  const reorderLines = dataset.skus.flatMap((sku) => locations.map((locationId) => {
    const distributorId = locationId.replace('LOC-', '')
    const norm = dataset.inventoryNorms.find((row) => row.skuId === sku.id && row.distributorId === distributorId)
    const latestActual = actualByKey.get(`${sku.id}|${distributorId}|${operationalWeeks.at(-1).weekId}`)
    const availableQty = Number(latestActual?.distributorStock || 0)
    const reviewHorizonRequirement = (norm?.targetStockQty || sku.baseWeekly) + 2 * (norm?.meanWeeklyDemand || sku.baseWeekly)
    const suggestedOrderQty = Math.max(0, Math.round(reviewHorizonRequirement - availableQty))
    return {
      skuId: sku.id, locationId, projectedStockoutWeek: suggestedOrderQty ? '2026-W35' : null, netRequirementQty: suggestedOrderQty,
      suggestedOrderQty, suggestedReleaseWeek: '2026-W33', suggestedReceiptWeek: '2026-W35', supplierId: dataset.manufacturingPartners[0].partnerId,
      reasonCodes: suggestedOrderQty ? ['BELOW_TARGET_STOCK'] : ['NO_ACTION'], lineHash: Math.floor(u(`reorder-line|${sku.id}|${locationId}`) * 0xffffffff).toString(16).padStart(8, '0'),
    }
  }))
  const reorderRecommendationVersions = [{
    recommendationVersionId: 'RRV-2026-W33-V1', calculatedAt: iso(ANCHOR), inventorySnapshotVersionId: 'INV-2026-W33-V1',
    forecastVersionId: 'FCST-2026-W33-V1', policyVersionId: 'POLICY-2026-W33-V1', calendarVersionId: CALENDAR_VERSION,
    status: 'CALCULATED', lines: reorderLines, ...provenance('DERIVED'),
  }]
  const reorderDecisions = reorderLines.filter((line) => line.suggestedOrderQty > 0).map((line, index) => {
    const decision = pick(`reorder-decision|${line.skuId}|${line.locationId}`, ['ACCEPT', 'MODIFY', 'REJECT', 'DEFER'])
    return {
      decisionId: `RDEC-${String(index + 1).padStart(4, '0')}`, recommendationVersionId: 'RRV-2026-W33-V1', skuId: line.skuId,
      locationId: line.locationId, decisionSequence: 1, decision, recommendedQty: line.suggestedOrderQty,
      decidedQty: decision === 'REJECT' ? 0 : decision === 'MODIFY' ? Math.round(line.suggestedOrderQty * 0.9) : line.suggestedOrderQty,
      deferUntilWeek: decision === 'DEFER' ? '2026-W35' : null, reasonCode: decision === 'REJECT' ? 'EXCESS_INBOUND' : 'PLANNER_REVIEW',
      comment: 'Deterministic seeded inventory decision', actorUserId: 'inventory.planner@boat.com', actedAt: iso(addDays(ANCHOR, 1)),
      createdPoNumber: null, workflowId: null, ...provenance(),
    }
  })

  const inventoryBatches = []
  const inventoryBatchMovements = []
  dataset.skus.forEach((sku, skuIndex) => locations.forEach((locationId, locationIndex) => {
    const batchId = `BATCH-${sku.id}-${locationId}-01`
    const receivedDate = addDays(ANCHOR, -(20 + Math.floor(120 * u(`batch-received|${batchId}`))))
    const originalQty = Math.max(1, Math.round(sku.baseWeekly * (0.7 + 0.5 * u(`batch-qty|${batchId}`))))
    const availableQty = Math.round(originalQty * (0.25 + 0.55 * u(`batch-available|${batchId}`)))
    const reservedQty = Math.min(availableQty, Math.round(availableQty * 0.15))
    inventoryBatches.push({
      batchId, locationId, skuId: sku.id, sourceReceiptId: `GRN-${skuIndex + 1}-${locationIndex + 1}`, supplierId: dataset.manufacturingPartners[(skuIndex + locationIndex) % dataset.manufacturingPartners.length].partnerId,
      manufacturedDate: dateOnly(addDays(receivedDate, -(3 + Math.floor(18 * u(`batch-mfg|${batchId}`))))), receivedDate: dateOnly(receivedDate), expiryDate: null,
      originalQty, availableQty, reservedQty, unitCostPaise: Math.round(sku.cost * 100), currency: 'INR', lotStatus: 'AVAILABLE', ...provenance(),
    })
    inventoryBatchMovements.push(
      { movementId: `BMOV-${batchId}-RECEIPT`, batchId, locationId, movementType: 'RECEIPT', quantity: originalQty, eventAt: iso(receivedDate), sourceEntityType: 'GOODS_RECEIPT', sourceEntityId: `GRN-${skuIndex + 1}-${locationIndex + 1}`, idempotencyKey: `GRN-${batchId}`, ...provenance() },
      { movementId: `BMOV-${batchId}-ISSUE`, batchId, locationId, movementType: 'ISSUE', quantity: originalQty - availableQty, eventAt: iso(addDays(receivedDate, 7)), sourceEntityType: 'DEMAND_FULFILMENT', sourceEntityId: `FUL-${batchId}`, idempotencyKey: `FUL-${batchId}`, ...provenance() },
    )
  }))

  const inventoryHealthObservations = dataset.skus.flatMap((sku) => locations.flatMap((locationId) => {
    const distributorId = locationId.replace('LOC-', '')
    const norm = dataset.inventoryNorms.find((row) => row.skuId === sku.id && row.distributorId === distributorId)
    let firstObservedWeek = null
    let consecutiveWeeks = 0
    return operationalWeeks.map((week) => {
      const actual = actualByKey.get(`${sku.id}|${distributorId}|${week.weekId}`)
      const onHandQty = Math.max(0, Number(actual?.distributorStock || 0))
      const availableQty = Math.max(0, onHandQty - Math.round(onHandQty * 0.08))
      const meanDaily = Math.max(1, Number(norm?.meanWeeklyDemand || sku.baseWeekly) / 7)
      const dos = round(availableQty / meanDaily, 2)
      const stockoutFlag = availableQty === 0 || availableQty < meanDaily * (norm?.leadTimeDays || 7)
      const excessFlag = dos > (norm?.maxDos || 45)
      const slowMovingFlag = dos > (norm?.maxDos || 45) * 1.5
      if (stockoutFlag || excessFlag || slowMovingFlag) {
        firstObservedWeek ||= week.weekId
        consecutiveWeeks += 1
      } else {
        firstObservedWeek = null
        consecutiveWeeks = 0
      }
      const batch = inventoryBatches.find((row) => row.skuId === sku.id && row.locationId === locationId)
      const obsoleteQty = slowMovingFlag ? Math.round(batch.availableQty * 0.15) : 0
      return {
        skuId: sku.id, locationId, weekId: week.weekId, inventorySnapshotVersionId: `INV-${week.weekId}-V1`, onHandQty, availableQty,
        inTransitQty: Math.round(meanDaily * 3), dos, policyMinDos: norm?.minDos || 7, policyMaxDos: norm?.maxDos || 45,
        stockoutFlag, excessFlag, slowMovingFlag, obsoleteQty, exposurePaise: obsoleteQty * Math.round(sku.cost * 100),
        status: stockoutFlag ? 'STOCKOUT_RISK' : excessFlag ? 'EXCESS' : 'HEALTHY', firstObservedWeek, consecutiveWeeks,
        closedWeek: !(stockoutFlag || excessFlag || slowMovingFlag) && firstObservedWeek ? week.weekId : null, ...provenance('DERIVED'),
      }
    })
  }))

  const scenarioDefinitions = [
    ['BASELINE', 'Baseline Consensus', 'APPROVED'], ['FESTIVE', 'Festive Demand Surge', 'REVIEW'], ['SUPPLIER_DELAY', 'Supplier Delay Recovery', 'DRAFT'],
  ]
  const scenarioVersions = scenarioDefinitions.map(([scenarioId, name, status], index) => ({
    scenarioVersionId: `SCV-${scenarioId}-V1`, scenarioId, versionNo: 1, name, baselinePlanVersionId: 'CPV-2026-W33-V1',
    calendarVersionId: CALENDAR_VERSION, assumptionSetId: `ASM-${scenarioId}-V1`, ownerUserId: 'sop.lead@boat.com', status,
    createdAt: iso(addDays(ANCHOR, -10 + index)), runAt: index < 2 ? iso(addDays(ANCHOR, -8 + index)) : null,
    approvedAt: index === 0 ? iso(addDays(ANCHOR, -5)) : null, publishedAt: null, workflowId: index === 0 ? 'SCWF-BASELINE-V1' : null,
    parentScenarioVersionId: null, ...provenance(),
  }))
  const leverDefinitions = [
    ['DEMAND_UPLIFT', 'DEMAND', 'MULTIPLY', 0.12], ['CHANNEL_MIX', 'DEMAND', 'ADD', 0.05], ['SUPPLIER_DELAY_DAYS', 'PROCUREMENT', 'ADD', 5],
    ['LINE_CAPACITY_DELTA', 'CAPACITY', 'ADD', 0.15], ['LEAD_TIME_DELTA', 'PROCUREMENT', 'ADD', 3], ['SERVICE_LEVEL_CHANGE', 'INVENTORY', 'ADD', 0.02],
    ['NET_PRICE_CHANGE', 'FINANCE', 'MULTIPLY', 0.04], ['UNIT_COST_CHANGE', 'FINANCE', 'MULTIPLY', 0.03],
  ]
  const scenarioAssumptionSets = scenarioVersions.flatMap((scenario) => leverDefinitions.map(([assumptionCode, domain, operator, base], index) => ({
    assumptionSetId: scenario.assumptionSetId, assumptionCode, scopeType: 'ENTERPRISE', scopeId: 'BOAT-INDIA', effectiveWeek: '2026-W34',
    domain, value: round(base * (0.85 + 0.3 * u(`scenario-lever|${scenario.scenarioVersionId}|${assumptionCode}`)), 4),
    unit: assumptionCode.includes('DAYS') || assumptionCode === 'LEAD_TIME_DELTA' ? 'DAYS' : 'RATE', operator,
    lowerBound: 0, upperBound: assumptionCode.includes('DAYS') || assumptionCode === 'LEAD_TIME_DELTA' ? 30 : 0.75,
    scope: { type: 'ENTERPRISE', ids: ['BOAT-INDIA'] }, effectiveFromWeek: '2026-W34', effectiveToWeek: '2027-W08',
    priority: index + 1, source: 'SEED', comment: `${scenario.name} ${assumptionCode} lever`, dataVersion: DATA_VERSION, generationSeed: GENERATION_SEED,
  })))
  const scenarioOutputLines = scenarioVersions.flatMap((scenario, scenarioIndex) => dataset.skus.flatMap((sku) => dataset.distributors.flatMap((distributor) => forwardWeeks.map((week) => {
    const baseline = Math.max(0, Math.round(sku.baseWeekly * ({ A: 0.26, B: 0.18, C: 0.12 }[distributor.tier] || 0.15)))
    const uplift = scenarioIndex === 1 ? 0.12 : 0
    const scenarioDemandQty = Math.round(baseline * (1 + uplift))
    const baselineSupplyQty = Math.round(baseline * 0.96)
    const scenarioSupplyQty = Math.round(baselineSupplyQty * (scenarioIndex === 2 ? 0.82 : 1.02))
    const openingInventoryQty = Math.round(baseline * 1.8)
    const closingInventoryQty = Math.max(0, openingInventoryQty + scenarioSupplyQty - scenarioDemandQty)
    const unmetDemandQty = Math.max(0, scenarioDemandQty - openingInventoryQty - scenarioSupplyQty)
    const revenuePaise = (scenarioDemandQty - unmetDemandQty) * Math.round(sku.price * 100)
    const grossMarginPaise = (scenarioDemandQty - unmetDemandQty) * Math.round((sku.price - sku.cost) * 100)
    return {
      scenarioVersionId: scenario.scenarioVersionId, skuId: sku.id, channelId: distributor.id, locationId: `LOC-${distributor.id}`, weekId: week.weekId,
      baselineDemandQty: baseline, scenarioDemandQty, baselineSupplyQty, scenarioSupplyQty, openingInventoryQty, closingInventoryQty,
      unmetDemandQty, revenuePaise, grossMarginPaise, costVariancePaise: (scenarioSupplyQty - baselineSupplyQty) * Math.round(sku.cost * 100),
      capacityGapQty: Math.max(0, scenarioDemandQty - scenarioSupplyQty), baselinePlanVersionId: 'CPV-2026-W33-V1', ...provenance('DERIVED'),
    }
  }))))

  const inventoryScenarioVersions = scenarioVersions.map((scenario) => ({
    inventoryScenarioVersionId: `ISV-${scenario.scenarioId}-V1`, scenarioVersionId: scenario.scenarioVersionId,
    baselineInventorySnapshotId: 'INV-2026-W33-V1', baselineForecastVersionId: 'FCST-2026-W33-V1', policyVersionId: 'POLICY-2026-W33-V1',
    assumptionSetId: scenario.assumptionSetId, ownerUserId: 'inventory.planner@boat.com', status: scenario.status,
    createdAt: scenario.createdAt, publishedAt: scenario.publishedAt, ...provenance(),
  }))
  const inventoryScenarioLines = scenarioOutputLines.filter((row) => weekById.get(row.weekId)?.weekIndex <= 11).map((row) => ({
    inventoryScenarioVersionId: `ISV-${row.scenarioVersionId.replace('SCV-', '').replace('-V1', '')}-V1`, skuId: row.skuId,
    locationId: row.locationId, weekId: row.weekId, openingQty: row.openingInventoryQty, receiptsQty: row.scenarioSupplyQty,
    demandQty: row.scenarioDemandQty, fulfilledQty: row.scenarioDemandQty - row.unmetDemandQty, lostDemandQty: row.unmetDemandQty,
    closingQty: row.closingInventoryQty, dos: round(row.closingInventoryQty / Math.max(row.scenarioDemandQty / 7, 1), 2),
    sourceScenarioVersionId: row.scenarioVersionId, sourcePlanVersionId: 'CPV-2026-W33-V1', ...provenance('DERIVED'),
  }))

  const financialPlanVersions = [{
    financialPlanVersionId: 'FPV-FY2027-V1', name: 'FY2027 Operating Plan', fiscalYear: 2027, scenarioVersionId: 'SCV-BASELINE-V1',
    status: 'APPROVED', ownerUserId: 'finance.controller@boat.com', approvedAt: iso(addDays(ANCHOR, -2)), lockedAt: null,
    currency: 'INR', ...provenance(),
  }]
  const budgetTargets = dataset.skus.flatMap((sku) => dataset.distributors.flatMap((distributor) => ['UNITS', 'NET_REVENUE', 'GROSS_MARGIN', 'COLLECTION'].map((measureCode) => {
    const unitTarget = Math.round(sku.baseWeekly * 13 * (1.04 + 0.14 * u(`budget-growth|${sku.category}|FY2027`)))
    const revenuePaise = unitTarget * Math.round(sku.price * 100)
    const marginPaise = unitTarget * Math.round((sku.price - sku.cost) * 100)
    const amount = measureCode === 'UNITS' ? null : measureCode === 'NET_REVENUE' ? revenuePaise : measureCode === 'GROSS_MARGIN' ? marginPaise : Math.round(revenuePaise * 0.92)
    return {
      financialPlanVersionId: 'FPV-FY2027-V1', skuId: sku.id, channelId: distributor.id, periodId: 'FY2027-Q1', measureCode,
      categoryCode: sku.category, regionId: dataset.regions.find((region) => region.name === distributor.region)?.id, targetValue: measureCode === 'UNITS' ? unitTarget : amount,
      unit: measureCode === 'UNITS' ? 'UNITS' : 'INR_PAISE', targetAmountPaise: amount, currency: 'INR', sourceAssumptionSetId: 'ASM-BASELINE-V1',
      ownerUserId: 'finance.controller@boat.com', ...provenance(),
    }
  })))

  const customerInvoices = advanceShipNotices.slice(0, 10).map((asn, index) => {
    const invoiceDate = addDays(new Date(asn.dispatchTimestamp), 1)
    const distributor = dataset.distributors[index % dataset.distributors.length]
    const account = distributorCreditAccounts.find((row) => row.distributorId === distributor.id)
    const lines = asn.lines.map((line, lineIndex) => {
      const sku = dataset.skus.find((row) => row.id === line.skuId) || dataset.skus[lineIndex % dataset.skus.length]
      return { invoiceLineId: `INVL-${index + 1}-${lineIndex + 1}`, skuId: sku.id, quantity: line.shippedQty, unitNetPricePaise: Math.round(sku.price * 0.94 * 100), schemeId: commercialSchemes[0]?.schemeId || null, lineNetAmountPaise: line.shippedQty * Math.round(sku.price * 0.94 * 100), asnLineId: line.asnLineId }
    })
    const grossAmountPaise = lines.reduce((sum, line) => sum + line.lineNetAmountPaise, 0)
    const discountPaise = Math.round(grossAmountPaise * 0.03)
    const taxPaise = Math.round((grossAmountPaise - discountPaise) * 0.18)
    return {
      invoiceId: `INV-${String(index + 1).padStart(4, '0')}`, distributorId: distributor.id, orderId: asn.orderId,
      invoiceDate: dateOnly(invoiceDate), dueDate: dateOnly(addDays(invoiceDate, account.paymentTermsDays)), paymentTermsDays: account.paymentTermsDays,
      grossAmountPaise, discountPaise, taxPaise, netAmountPaise: grossAmountPaise - discountPaise + taxPaise,
      currency: 'INR', status: index < 6 ? 'PAID' : 'OPEN', sourceRunId: asn.sourceRunId, lines, ...provenance(),
    }
  })
  const cashReceipts = customerInvoices.filter((invoice) => invoice.status === 'PAID').map((invoice, index) => {
    const delay = Math.round(signed(`collection-delay|${invoice.invoiceId}`, 12))
    const amountPaise = invoice.netAmountPaise
    return {
      receiptId: `RCPT-${String(index + 1).padStart(4, '0')}`, distributorId: invoice.distributorId,
      receivedDate: dateOnly(addDays(new Date(`${invoice.dueDate}T00:00:00.000Z`), delay)), amountPaise,
      paymentMethod: index % 2 ? 'NEFT' : 'RTGS', bankReference: `UTR2026${String(index + 1).padStart(8, '0')}`, status: 'CLEARED',
      sourceRunId: `RUN-CASH-${index + 1}`, allocations: [{ invoiceId: invoice.invoiceId, allocatedAmountPaise: amountPaise, writeOffPaise: 0, discountTakenPaise: 0 }], ...provenance(),
    }
  })
  const receivableSnapshots = customerInvoices.map((invoice) => {
    const receipt = cashReceipts.find((row) => row.allocations.some((allocation) => allocation.invoiceId === invoice.invoiceId))
    const paidToDatePaise = receipt?.amountPaise || 0
    const openAmountPaise = Math.max(0, invoice.netAmountPaise - paidToDatePaise)
    const daysPastDue = Math.max(0, Math.floor((ANCHOR - new Date(`${invoice.dueDate}T00:00:00.000Z`)) / 86400000))
    return {
      invoiceId: invoice.invoiceId, asOfDate: dateOnly(ANCHOR), distributorId: invoice.distributorId, dueDate: invoice.dueDate,
      originalAmountPaise: invoice.netAmountPaise, paidToDatePaise, openAmountPaise, daysPastDue,
      agingBucket: daysPastDue === 0 ? 'CURRENT' : daysPastDue <= 30 ? '1_30' : daysPastDue <= 60 ? '31_60' : daysPastDue <= 90 ? '61_90' : '90_PLUS',
      currency: 'INR', sourceInvoiceVersionId: DATA_VERSION, sourceReceiptIds: receipt ? [receipt.receiptId] : [], ...provenance('DERIVED'),
    }
  })
  const distributorCreditSnapshots = distributorCreditAccounts.map((account) => {
    const invoicedOpenPaise = receivableSnapshots.filter((row) => row.distributorId === account.distributorId).reduce((sum, row) => sum + row.openAmountPaise, 0)
    const overduePaise = receivableSnapshots.filter((row) => row.distributorId === account.distributorId && row.daysPastDue > 0).reduce((sum, row) => sum + row.openAmountPaise, 0)
    const unbilledDispatchPaise = Math.round(account.creditLimitPaise * 0.04 * u(`unbilled|${account.distributorId}`))
    const approvedOrderExposurePaise = Math.round(account.creditLimitPaise * 0.05 * u(`order-exposure|${account.distributorId}`))
    const availableCreditPaise = Math.max(0, account.creditLimitPaise + account.temporaryLimitPaise - invoicedOpenPaise - unbilledDispatchPaise - approvedOrderExposurePaise)
    return {
      distributorId: account.distributorId, asOfDate: dateOnly(ANCHOR), invoicedOpenPaise, unbilledDispatchPaise, approvedOrderExposurePaise,
      overduePaise, availableCreditPaise, utilizationPct: round(1 - availableCreditPaise / Math.max(account.creditLimitPaise + account.temporaryLimitPaise, 1), 4),
      sourceIds: receivableSnapshots.filter((row) => row.distributorId === account.distributorId).map((row) => row.invoiceId), ...provenance('DERIVED'),
    }
  })

  const reportJobs = [
    ['RPT-PLAN-001', 'CONSENSUS_PLAN', consensusPlanLines.length], ['RPT-KPI-001', 'KPI_SCORECARD', kpiObservations.length], ['RPT-FORECAST-001', 'FORECAST_ACCURACY', dataset.forecastAccuracyHistory.length],
  ].map(([jobId, reportType, rowCount], index) => ({
    jobId, reportType, requestedBy: index === 1 ? 'finance.controller@boat.com' : 'sop.lead@boat.com', requestedAt: iso(addDays(ANCHOR, -3 + index)),
    parameters: { calendarVersionId: CALENDAR_VERSION }, sourceVersionIds: [DATA_VERSION], format: index === 1 ? 'XLSX' : 'CSV', status: 'COMPLETED',
    startedAt: iso(addDays(ANCHOR, -3 + index)), completedAt: iso(new Date(addDays(ANCHOR, -3 + index).getTime() + 60000)), rowCount, errorCode: null, ...provenance(),
  }))
  const reportArtifacts = reportJobs.map((job, index) => ({
    artifactId: `ART-${job.jobId}`, jobId: job.jobId, fileName: `${job.reportType.toLowerCase()}-2026-W33.${job.format.toLowerCase()}`,
    mimeType: job.format === 'XLSX' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
    storageKey: `reports/2026/W33/${job.jobId}`, byteSize: 2048 + job.rowCount * 64,
    checksumFNV1a: Math.floor(u(`report-checksum|${job.jobId}`) * 0xffffffff).toString(16).padStart(8, '0'),
    expiresAt: iso(addDays(ANCHOR, 30 + index)), createdAt: job.completedAt, ...provenance(),
  }))

  const assistantGroundingTraces = Array.from({ length: 5 }, (_, index) => {
    const answeredAt = iso(addDays(ANCHOR, -5 + index))
    const responseText = `Persisted planning answer ${index + 1} for 2026-W33`
    return {
      traceId: `TRACE-SEED-${String(index + 1).padStart(3, '0')}`, sessionId: `CHAT-SEED-${String(index + 1).padStart(3, '0')}`,
      assistantMessageId: `MSG-A-${index + 1}`, userMessageId: `MSG-U-${index + 1}`, intentCode: ['FORECAST', 'INVENTORY', 'SUPPLY', 'FINANCE', 'KPI'][index],
      requestedAt: iso(new Date(new Date(answeredAt).getTime() - 1200)), answeredAt, model: 'seeded-demo-model', modelVersion: 'v1', promptTemplateVersion: 'SOP-PROMPT-V1',
      dataVersion: DATA_VERSION, calendarVersionId: CALENDAR_VERSION, sourceEntityRefs: [{ entityType: 'KPI_OBSERVATION', entityId: `${kpiDefinitions[index].kpiCode}|2026-W33` }],
      sourceVersionIds: [DATA_VERSION], insightIds: [], toolCalls: ['persisted_collection_lookup'], inputTokenCount: 80 + index * 5,
      outputTokenCount: Math.max(1, Math.round(responseText.length / 4)), latencyMs: 450 + Math.floor(2200 * u(`chat-latency|TRACE-SEED-${index + 1}`)),
      status: 'SUCCESS', errorCode: null, errorDetail: null, responseHashFNV1a: Math.floor(u(`response-hash|${responseText}`) * 0xffffffff).toString(16).padStart(8, '0'),
      retentionUntil: iso(addDays(ANCHOR, 180)), ...provenance(),
    }
  })

  const extraWorkflowInstances = [
    { workflowId: 'OWF-ORD-BOAT-DST001-2026W33', workflowType: 'ORDER_APPROVAL', subjectType: 'DISTRIBUTOR_ORDER', subjectId: 'ORD-BOAT-DST001-2026W33', sourceVersionId: 'ORDER-V1', status: 'IN_REVIEW', currentStep: 2, dueAt: iso(addDays(ANCHOR, 2)), lockedAt: null, createdAt: iso(addDays(ANCHOR, -2)), updatedAt: iso(ANCHOR), ...provenance() },
    { workflowId: 'SCWF-BASELINE-V1', workflowType: 'SCENARIO_APPROVAL', subjectType: 'SCENARIO_VERSION', subjectId: 'SCV-BASELINE-V1', sourceVersionId: 'SCV-BASELINE-V1', status: 'APPROVED', currentStep: null, dueAt: iso(ANCHOR), lockedAt: iso(addDays(ANCHOR, -5)), createdAt: iso(addDays(ANCHOR, -10)), updatedAt: iso(addDays(ANCHOR, -5)), ...provenance() },
  ]
  const extraWorkflowSteps = [
    ['OWF-ORD-BOAT-DST001-2026W33', 'ORDER_APPROVAL', 1, 'SALES_REVIEW', 'Sales Head', 'sales.manager@boat.com', 'COMPLETED'],
    ['OWF-ORD-BOAT-DST001-2026W33', 'ORDER_APPROVAL', 2, 'CREDIT_REVIEW', 'Finance', 'finance.controller@boat.com', 'IN_PROGRESS'],
    ['OWF-ORD-BOAT-DST001-2026W33', 'ORDER_APPROVAL', 3, 'SUPPLY_REVIEW', 'Supply Planner', 'supply.planner@boat.com', 'PENDING'],
    ['SCWF-BASELINE-V1', 'SCENARIO_APPROVAL', 1, 'SOP_REVIEW', 'S&OP Lead', 'sop.lead@boat.com', 'COMPLETED'],
    ['SCWF-BASELINE-V1', 'SCENARIO_APPROVAL', 2, 'FINANCE_REVIEW', 'Finance', 'finance.controller@boat.com', 'COMPLETED'],
    ['SCWF-BASELINE-V1', 'SCENARIO_APPROVAL', 3, 'PUBLISH_APPROVAL', 'S&OP Lead', 'sop.lead@boat.com', 'COMPLETED'],
  ].map(([workflowId, workflowType, stepSequence, stepCode, assignedRole, assignedUserId, status]) => ({
    workflowId, workflowType, stepSequence, stepCode, assignedRole, assignedUserId, status,
    decision: status === 'COMPLETED' ? 'APPROVED' : null, comment: status === 'COMPLETED' ? 'Seed approval' : null,
    actedAt: status === 'COMPLETED' ? iso(addDays(ANCHOR, -8 + stepSequence)) : null, dueAt: iso(addDays(ANCHOR, stepSequence)), ...provenance(),
  }))
  const extraAuditEvents = [
    ['AUD-ORDER-001', 'OWF-ORD-BOAT-DST001-2026W33', 'ORDER_APPROVAL', 1, 'DISTRIBUTOR_ORDER', 'ORD-BOAT-DST001-2026W33', 'CREATED', null, 'DRAFT', 'sales.manager@boat.com', 'Sales Head', 1],
    ['AUD-ORDER-002', 'OWF-ORD-BOAT-DST001-2026W33', 'ORDER_APPROVAL', 1, 'DISTRIBUTOR_ORDER', 'ORD-BOAT-DST001-2026W33', 'APPROVED', 'DRAFT', 'IN_REVIEW', 'sales.manager@boat.com', 'Sales Head', 2],
    ['AUD-SCENARIO-001', 'SCWF-BASELINE-V1', 'SCENARIO_APPROVAL', 1, 'SCENARIO_VERSION', 'SCV-BASELINE-V1', 'CREATED', null, 'DRAFT', 'sop.lead@boat.com', 'S&OP Lead', 1],
    ['AUD-SCENARIO-002', 'SCWF-BASELINE-V1', 'SCENARIO_APPROVAL', 1, 'SCENARIO_VERSION', 'SCV-BASELINE-V1', 'APPROVED', 'DRAFT', 'REVIEW', 'sop.lead@boat.com', 'S&OP Lead', 2],
    ['AUD-SCENARIO-003', 'SCWF-BASELINE-V1', 'SCENARIO_APPROVAL', 2, 'SCENARIO_VERSION', 'SCV-BASELINE-V1', 'APPROVED', 'REVIEW', 'APPROVED', 'finance.controller@boat.com', 'Finance', 3],
    ['AUD-SCENARIO-004', 'SCWF-BASELINE-V1', 'SCENARIO_APPROVAL', 3, 'SCENARIO_VERSION', 'SCV-BASELINE-V1', 'PUBLISHED', 'APPROVED', 'PUBLISHED', 'sop.lead@boat.com', 'S&OP Lead', 4],
  ].map(([auditId, workflowId, workflowType, stepSequence, entityType, entityId, action, oldValue, newValue, actorUserId, actorRole, sequence]) => ({
    auditId, workflowId, workflowType, stepSequence, entityType, entityId, action, fieldPath: 'status', oldValue, newValue,
    actorUserId, actorRole, reasonCode: 'SEED_TRANSITION', comment: 'Deterministic seeded workflow transition',
    occurredAt: iso(addDays(ANCHOR, -12 + sequence)), sequence, ...provenance(),
  }))
  const workflowInstances = [...dataset.workflowInstances, ...extraWorkflowInstances]
  const workflowSteps = [...dataset.workflowSteps, ...extraWorkflowSteps]
  const entityAuditEvents = [...dataset.entityAuditEvents, ...extraAuditEvents]

  const productionWorkflowEvents = dataset.entityAuditEvents
  const notificationDeliveries = productionWorkflowEvents.slice(0, 12).map((event, index) => {
    const recipient = users[index % 6]
    const draw = u(`notification|${event.auditId}|${recipient.userId}`)
    const status = draw < 0.94 ? 'DELIVERED' : draw < 0.98 ? 'PENDING' : 'FAILED'
    const scheduledAt = iso(new Date(new Date(event.occurredAt).getTime() + (index % 2 ? 15 : 1) * 60000))
    return {
      notificationId: `NOTIF-${event.auditId}`, recipientUserId: recipient.userId, channel: index % 2 ? 'EMAIL' : 'IN_APP',
      sourceEntityType: event.entityType, sourceEntityId: event.entityId, eventType: 'WORKFLOW_TRANSITION', severity: event.action === 'LOCKED' ? 'INFO' : 'WARNING',
      subject: `${event.workflowType} ${event.action}`, bodyTemplate: 'WORKFLOW_TRANSITION_V1', createdAt: event.occurredAt, scheduledAt,
      sentAt: status === 'DELIVERED' ? scheduledAt : null, readAt: null, status, failureCode: status === 'FAILED' ? 'DELIVERY_FAILED' : null, ...provenance(),
    }
  })

  return {
    planningCalendarVersions, planningWeeks, lifecycleTransitionHistory, npiProducts, npiReadinessItems, eventTemplates,
    channelInventoryNorms, factorAdjustedDemandProposals, consensusPlanVersions, consensusPlanLines, users, roleAssignments,
    kpiDefinitions, kpiObservations, notificationSubscriptions, notificationDeliveries, reportJobs, reportArtifacts,
    integrationRuns, marketBenchmarkFacts, commercialSchemes, distributorCreditAccounts, distributorCreditSnapshots,
    dealers, dealerSkuWeekly, advanceShipNotices, dispatchMilestones, lineCapacityPlans, capacityExpansionPlans,
    productionExecutionEvents, importShipmentMilestones, transferMilestones, reorderRecommendationVersions, reorderDecisions,
    inventoryScenarioVersions, inventoryScenarioLines, inventoryHealthObservations, inventoryBatches, inventoryBatchMovements,
    scenarioVersions, scenarioAssumptionSets, scenarioOutputLines, financialPlanVersions, budgetTargets, customerInvoices,
    cashReceipts, receivableSnapshots, assistantGroundingTraces,
    workflowInstances, workflowSteps, entityAuditEvents,
  }
}

module.exports = { buildMasterEntities }
