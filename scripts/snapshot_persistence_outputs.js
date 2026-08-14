const fs = require('fs')
const path = require('path')

const baseUrl = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:3010'
const outputDir = path.resolve(process.cwd(), 'output')

function write(name, rows) {
  fs.writeFileSync(path.join(outputDir, `${name}.json`), `${JSON.stringify(rows, null, 2)}\n`)
  console.log(`${name}: ${Array.isArray(rows) ? rows.length : 1}`)
}

async function json(apiPath) {
  const response = await fetch(`${baseUrl}${apiPath}`)
  if (!response.ok) throw new Error(`${apiPath}: HTTP ${response.status}`)
  return response.json()
}

function dateOnly(value) {
  return value ? String(value).split('T')[0] : null
}

async function main() {
  const [regions, distributors, skus, weeks, weekly] = await Promise.all([
    json('/api/data/regions'),
    json('/api/data/distributors'),
    json('/api/data/skus'),
    json('/api/data/weeks'),
    json('/api/data/weekly').then((value) => value.rows),
  ])
  write('sop_regions', regions)
  write('sop_distributors', distributors)
  write('sop_skus', skus)
  write('sop_weeks', weeks)
  write('sop_weekly', weekly)

  const demandEndpoints = {
    demand_channel_integrations: 'channel-integrations',
    demand_listings: 'listings',
    demand_lifecycle: 'lifecycle',
    demand_npi_forecasts: 'npi-forecasts',
    demand_events: 'events',
    demand_consensus_workflows: 'consensus-workflows',
  }
  for (const [collection, endpoint] of Object.entries(demandEndpoints)) {
    const payload = await json(`/api/demand/${endpoint}`)
    write(collection, payload.rows)
  }
  write('channel_inventory_norms', (await json('/api/demand/inventory-norms')).rows.map(({ effectiveDos, varianceDays, normStatus, canonicalCollection, ...row }) => row))

  write('dashboard_review_cycles', [await json('/api/dashboard/review-cycle')])
  write('inventory_policies', (await json('/api/inventory/policies')).rows)

  const suggestions = []
  const activationGaps = []
  for (const distributor of distributors) {
    suggestions.push(await json(`/api/orders/suggest?distributorId=${distributor.id}`))
    activationGaps.push(await json(`/api/orders/dealer-activation-gap?distributorId=${distributor.id}`))
  }
  write('order_suggestions', suggestions)
  write('dealer_activation_gaps', activationGaps)
  write('order_rules', [
    { ruleId: 'ORDER-FREEZE-01', window: 'Day 1-24', startDay: 1, endDay: 24, state: 'editable', label: 'Fully editable', maxDeltaPct: null },
    { ruleId: 'ORDER-FREEZE-02', window: 'Day 25-28', startDay: 25, endDay: 28, state: 'restricted', label: 'Max +/-10% per-line change', maxDeltaPct: 10 },
    { ruleId: 'ORDER-FREEZE-03', window: 'Day 29+', startDay: 29, endDay: null, state: 'locked', label: 'Locked - approval required', maxDeltaPct: 0 },
  ])
  write('planning_rules', [
    { ruleId: 'RULE-MRP-01', ruleName: 'Time-Phased Inventory Netting Formula', formula: 'Projected Stock = Available Inventory + Planned Production + Planned Purchase - Gross Demand', description: 'Calculates time-phased closing inventory balance for each persisted supply-plan week.' },
    { ruleId: 'RULE-HORIZON-01', ruleName: '3-Tier Planning Horizon Structure', formula: 'Firm / Tactical / Strategic horizons are derived from persisted forecast weeks', description: 'Uses persisted forecast and capacity weeks for the rolling planning horizon.' },
    { ruleId: 'RULE-SLA-01', ruleName: 'Service Level Calculation', formula: 'SLA % = (1 - Deficit Units / Gross Forecast) * 100', description: 'Calculates fulfillment against persisted consensus forecast and supply deficit.' },
    { ruleId: 'RULE-MOQ-01', ruleName: 'MOQ & Order Multiple Rounding Rule', formula: 'Planned Purchase = ceil(max(Net Requirement, MOQ) / Order Multiple) * Order Multiple', description: 'Uses persisted supplier-product MOQ and order-multiple values.' },
  ])

  const selectedSuggestion = suggestions.find((row) => row.distributor?.id === 'DST-001') || suggestions[0]
  const orderLines = selectedSuggestion.lines.filter((line) => line.suggestedQty > 0).slice(0, 3).map((line) => ({
    skuId: line.skuId,
    skuName: line.skuName,
    category: line.category,
    qty: line.suggestedQty,
    unitPrice: line.price,
    effectivePrice: line.price,
    lineValue: line.suggestedQty * line.price,
    scheme: line.scheme || null,
    discountPct: 0,
  }))
  const order = {
    orderId: 'ORD-BOAT-DST001-2026W33',
    distributorId: selectedSuggestion.distributor.id,
    distributorName: selectedSuggestion.distributor.name,
    status: 'Pending',
    lines: orderLines,
    totalQty: orderLines.reduce((sum, line) => sum + line.qty, 0),
    totalValue: orderLines.reduce((sum, line) => sum + line.lineValue, 0),
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
  }
  write('orders', [order])
  write('dispatch_records', orderLines.map((line) => ({
    dispatchId: `DSP-${order.orderId}-${line.skuId}`,
    orderId: order.orderId,
    distributorId: order.distributorId,
    skuId: line.skuId,
    skuName: line.skuName,
    orderedQty: line.qty,
    dispatchedQty: 0,
    gap: line.qty,
    status: 'Pending',
    fillRatePct: 0,
    updatedAt: order.updatedAt,
  })))

  const suggestionsPayload = await json('/api/chat/suggestions')
  write('chat_suggestions', suggestionsPayload.suggestions.map((question, index) => ({ suggestionId: `CHAT-Q-${index + 1}`, question })))

  const supply = async (action) => (await json(`/api/v1/supply-planning?action=${action}`)).data
  const imports = await supply('import_control_tower')
  const warnings = (await supply('early_warning_system')).map((row) => ({
    ...row,
    affectedPlant: row.affectedPlant === 'PLANT-NOIDA' ? 'PLANT-NOIDA-01' : row.affectedPlant === 'PLANT-CHENNAI' ? 'PLANT-CHETPET-03' : row.affectedPlant,
  }))
  const rootCauses = (await supply('root_cause_analysis')).map((row) => ({
    ...row,
    affectedResources: row.affectedResources.map((resource) => resource === 'PLANT-NOIDA' ? 'PLANT-NOIDA-01' : resource === 'PLANT-CHENNAI' ? 'PLANT-CHETPET-03' : resource),
  }))
  write('import_shipments', imports)
  write('early_warnings', warnings)
  write('root_cause_analyses', rootCauses)
  write('executive_recommendations', await supply('executive_recommendation_engine'))
  // Workflow state and audit are shared platform facts. Preserve the generated
  // collections instead of rebuilding module-specific embedded histories.
  for (const collection of ['consensus_production_plans', 'workflow_instances', 'workflow_steps', 'entity_audit_events']) {
    write(collection, JSON.parse(fs.readFileSync(path.join(outputDir, `${collection}.json`), 'utf8')))
  }

  // DR2-owned sourcing/procurement collections are regenerated by
  // regenerate_dummy_data_outputs.js. Snapshotting must preserve those stored
  // facts rather than reconstructing handover, capacity, or reliability here.
  for (const collection of ['purchase_orders', 'po_adherence_history', 'supplier_master', 'supplier_reliability_history']) {
    write(collection, JSON.parse(fs.readFileSync(path.join(outputDir, `${collection}.json`), 'utf8')))
  }

  const scenarios = JSON.parse(fs.readFileSync(path.join(outputDir, 'what_if_scenarios.json'), 'utf8')).map((scenario) => ({
    ...scenario,
    costVarianceInr: scenario.costVarianceInr ?? null,
    serviceLevelDelta: scenario.serviceLevelDelta ?? null,
    revenueAtRiskRecovered: scenario.revenueAtRiskRecovered ?? null,
  }))
  write('what_if_scenarios', scenarios)

  const pricing = JSON.parse(fs.readFileSync(path.join(outputDir, 'product_pricing.json'), 'utf8'))
  const ad141Price = pricing.find((row) => row.skuCode === 'SKU-BOAT-AD141')?.averageSellingPrice || 0
  const constraints = JSON.parse(fs.readFileSync(path.join(outputDir, 'supply_constraints.json'), 'utf8')).map((constraint) => {
    const units = Number(constraint.description.match(/(\d[\d,]*) units/i)?.[1]?.replaceAll(',', '') || 0)
    return { ...constraint, revenueAtRiskInr: constraint.revenueAtRiskInr ?? Math.round(units * ad141Price) }
  })
  write('supply_constraints', constraints)

  const dataSourceCollections = [
    ['CAT-DEMAND', 'consensus_forecast'], ['CAT-INVENTORY', 'inventory'], ['CAT-CAPACITY', 'plant_master'],
    ['CAT-SUPPLIER', 'supplier_master'], ['CAT-PROCUREMENT', 'purchase_orders'], ['CAT-PRODUCTION', 'production_orders'],
    ['CAT-RULES', 'planning_rules'], ['CAT-MASTERDATA', 'product_master'],
  ]
  write('data_source_logs', dataSourceCollections.map(([categoryId, collectionName]) => ({
    sourceId: categoryId,
    categoryId,
    collectionName,
    sourceType: 'MONGO_COLLECTION',
    healthStatus: 'HEALTHY',
    lastSyncTime: '2026-08-11T00:00:00.000Z',
  })))

  write('financial_planning_config', [{
    configId: 'FIN-PLAN-DEFAULT',
    schemeCostPerUnit: 350,
    logisticsCostPerUnit: 150,
    businessCategoryMap: { 'TWS Earbuds': 'TWS', Neckbands: 'Neckband', Smartwatches: 'Wearable', 'Wired Audio': 'Wired', 'Portable Speakers': 'Speaker' },
    channelByDistributor: { 'DST-001': 'national', 'DST-002': 'distributor', 'DST-003': 'pilot', 'DST-004': 'national', 'DST-005': 'distributor' },
    segmentByDistributor: { 'DST-001': 'direct dealer', 'DST-002': 'distributor', 'DST-003': 'modern trade', 'DST-004': 'e-commerce', 'DST-005': 'distributor' },
    collectionProfiles: {
      'direct dealer': { terms: '7 days', current: 0.86, dpd0_30: 0.10, dpd30_60: 0.03, over60: 0.01 },
      distributor: { terms: '30 days', current: 0.63, dpd0_30: 0.22, dpd30_60: 0.10, over60: 0.05 },
      'modern trade': { terms: '45 days', current: 0.54, dpd0_30: 0.24, dpd30_60: 0.14, over60: 0.08 },
      'e-commerce': { terms: '15 days', current: 0.76, dpd0_30: 0.17, dpd30_60: 0.05, over60: 0.02 },
    },
    updatedAt: '2026-08-11T00:00:00.000Z',
  }])

  write('demand_factor_config', [{
    configId: 'DEMAND-FACTORS-DEFAULT',
    plcMultipliers: { New: 1.2, Growth: 1.5, Mature: 1.0, Decline: 0.7 },
    seasonalityPatterns: {
      Smartwatches: [0.92, 0.90, 0.95, 1.00, 1.03, 1.05, 1.08, 1.10, 1.18, 1.32, 1.38, 1.24],
      'TWS Earbuds': [0.94, 0.92, 0.96, 1.00, 1.02, 1.06, 1.10, 1.14, 1.22, 1.30, 1.34, 1.20],
      Neckbands: [0.96, 0.95, 0.98, 1.00, 1.03, 1.05, 1.08, 1.11, 1.16, 1.24, 1.28, 1.14],
      'Wired Audio': [1.08, 1.06, 1.02, 0.98, 0.94, 0.92, 0.90, 0.92, 0.98, 1.08, 1.16, 1.18],
      'Portable Speakers': [0.90, 0.88, 0.92, 0.98, 1.02, 1.08, 1.12, 1.18, 1.24, 1.36, 1.42, 1.26],
    },
    promotionWeeks: [8, 9, 15, 16, 22, 23],
    promotionUplift: 1.4,
    regionMultipliers: {
      North: { Smartwatches: 1.12, 'TWS Earbuds': 1.08, Neckbands: 0.96, 'Wired Audio': 1.05, 'Portable Speakers': 1.10 },
      South: { Smartwatches: 0.94, 'TWS Earbuds': 0.98, Neckbands: 1.14, 'Wired Audio': 0.92, 'Portable Speakers': 1.02 },
      West: { Smartwatches: 1.04, 'TWS Earbuds': 1.06, Neckbands: 1.00, 'Wired Audio': 0.98, 'Portable Speakers': 1.08 },
    },
    updatedAt: '2026-08-11T00:00:00.000Z',
  }])

  write('dashboard_alerts', warnings.slice(0, 4).map((warning) => ({
    alertId: warning.warningId,
    severity: warning.severity.toLowerCase(),
    title: warning.impact,
    occurredAt: warning.riskDate,
  })))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
