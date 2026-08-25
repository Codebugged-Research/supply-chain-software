const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { buildMasterEntities } = require('./master_entity_builder')

function loadFreshGenerator() {
  let source = fs.readFileSync(path.resolve(process.cwd(), 'lib', 'dummyData.js'), 'utf8')
  source = source.replace(/^import\s+[^\n]+\n/m, '').replace(/\bexport\s+/g, '')
  source += '\n;globalThis.__dummyDataExports = { getDataset, stableUnit01, XYZ_CV_THRESHOLDS, suggestOrders, buildDealerActivationGap };'
  const context = vm.createContext({ console, Date, Math, Set, Map, Object, Array, Number, String, Boolean, JSON })
  vm.runInContext(source, context, { filename: 'lib/dummyData.js' })
  return context.__dummyDataExports
}

function outputDirectory() {
  const flagIndex = process.argv.indexOf('--output-dir')
  const requested = flagIndex >= 0 ? process.argv[flagIndex + 1] : 'output'
  if (!requested) throw new Error('--output-dir requires a directory path')
  return path.resolve(process.cwd(), requested)
}

function writeCollection(directory, name, rows) {
  const file = path.join(directory, `${name}.json`)
  fs.writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`)
  console.log(`${name}: ${rows.length}`)
}

function main() {
  const directory = outputDirectory()
  fs.mkdirSync(directory, { recursive: true })
  const { getDataset, stableUnit01, XYZ_CV_THRESHOLDS, suggestOrders, buildDealerActivationGap } = loadFreshGenerator()
  const dataset = getDataset()
  const master = buildMasterEntities(dataset, stableUnit01)
  const existingPoliciesFile = path.join(directory, 'inventory_policies.json')
  const existingPolicies = fs.existsSync(existingPoliciesFile) ? JSON.parse(fs.readFileSync(existingPoliciesFile, 'utf8')) : []
  const existingPolicyBySku = new Map(existingPolicies.map((row) => [row.skuId, row]))
  const inventoryAnalytics = dataset.skus.map((sku) => {
    const history = dataset.weekly.filter((row) => row.skuId === sku.id)
    const weeklyTotals = new Map()
    history.forEach((row) => weeklyTotals.set(row.weekId, (weeklyTotals.get(row.weekId) || 0) + row.tertiary))
    const demand = Array.from(weeklyTotals.values())
    const mean = demand.reduce((sum, value) => sum + value, 0) / Math.max(1, demand.length)
    const stdDev = Math.sqrt(demand.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, demand.length))
    return {
      sku,
      mean,
      stdDev,
      demandCv: mean ? stdDev / mean : 0,
      consumptionValue: history.reduce((sum, row) => sum + row.tertiary * row.price, 0),
    }
  }).sort((a, b) => b.consumptionValue - a.consumptionValue || a.sku.id.localeCompare(b.sku.id))
  const totalConsumption = inventoryAnalytics.reduce((sum, row) => sum + row.consumptionValue, 0) || 1
  let cumulativeConsumption = 0
  const inventoryPolicies = inventoryAnalytics.map((item) => {
    cumulativeConsumption += item.consumptionValue
    const cumulativePct = cumulativeConsumption / totalConsumption * 100
    const abcClass = cumulativePct <= 80 ? 'A' : cumulativePct <= 95 ? 'B' : 'C'
    const xyzClass = item.demandCv <= XYZ_CV_THRESHOLDS.X_MAX ? 'X' : item.demandCv <= XYZ_CV_THRESHOLDS.Y_MAX ? 'Y' : 'Z'
    const existing = existingPolicyBySku.get(item.sku.id) || {}
    const suggestedSafetyStockUnits = Math.ceil((existing.suggestedSafetyStockUnits || 0) * (item.stdDev / Math.max(1, existing.stdDevWeeklyDemand || item.stdDev)))
    return {
      ...existing,
      policyId: existing.policyId || `INV-${item.sku.id}`,
      skuId: item.sku.id,
      skuName: item.sku.name,
      category: item.sku.category,
      abcClass,
      xyzClass,
      segment: `${abcClass}${xyzClass}`,
      velocityClass: abcClass === 'A' ? 'FAST' : abcClass === 'B' ? 'MEDIUM' : 'SLOW',
      variabilityClass: xyzClass === 'X' ? 'STABLE' : xyzClass === 'Y' ? 'VARIABLE' : 'ERRATIC',
      consumptionValue: Math.round(item.consumptionValue),
      avgWeeklyDemand: Math.round(item.mean),
      avgDailyDemand: item.mean / 7,
      stdDevWeeklyDemand: Math.round(item.stdDev),
      demandCv: Number(item.demandCv.toFixed(3)),
      suggestedSafetyStockUnits,
    }
  })
  const collections = {
    sop_regions: dataset.regions,
    sop_distributors: dataset.distributors,
    sop_skus: dataset.skus,
    sop_weeks: dataset.weeks,
    sop_planning_weeks: dataset.planningWeeks,
    sop_weekly: dataset.weekly,
    demand_lifecycle: dataset.lifecycle,
    demand_channel_integrations: dataset.demandChannelIntegrations,
    demand_listings: dataset.demandListings,
    demand_npi_forecasts: dataset.npiForecasts,
    demand_npi_readiness_items: dataset.npiReadinessItems,
    demand_event_templates: dataset.eventTemplates,
    demand_events: dataset.demandEvents,
    inventory_policies: inventoryPolicies,
    order_suggestions: dataset.distributors.map((distributor) => suggestOrders(distributor.id)),
    dealer_activation_gaps: dataset.distributors.map((distributor) => buildDealerActivationGap(distributor.id)),
    manufacturing_partners: dataset.manufacturingPartners,
    manufacturing_partner_lines: dataset.manufacturingPartnerLines,
    supplier_master: dataset.supplierMaster,
    supplier_product_mapping: dataset.supplierProductMapping,
    purchase_orders: dataset.purchaseOrders,
    po_exclusions: dataset.poExclusions,
    po_revisions: dataset.poRevisions,
    po_adherence_observations: dataset.poAdherenceObservations,
    po_adherence_history: dataset.poAdherenceHistory,
    goods_receipt_inspections: dataset.goodsReceiptInspections,
    supplier_reliability_history: dataset.supplierReliabilityHistory,
    forecast_vintages: dataset.forecastVintages,
    forecast_accuracy_history: dataset.forecastAccuracyHistory,
    demand_consensus_workflows: dataset.demandConsensusWorkflows,
    consensus_production_plans: dataset.consensusProductionPlans,
    workflow_instances: master.workflowInstances,
    workflow_steps: master.workflowSteps,
    entity_audit_events: master.entityAuditEvents,
    planning_calendar_versions: master.planningCalendarVersions,
    planning_weeks: master.planningWeeks,
    lifecycle_transition_history: master.lifecycleTransitionHistory,
    npi_products: master.npiProducts,
    npi_readiness_items: master.npiReadinessItems,
    event_templates: master.eventTemplates,
    channel_inventory_norms: master.channelInventoryNorms,
    factor_adjusted_demand_proposals: master.factorAdjustedDemandProposals,
    consensus_plan_versions: master.consensusPlanVersions,
    consensus_plan_lines: master.consensusPlanLines,
    users: master.users,
    role_assignments: master.roleAssignments,
    kpi_definitions: master.kpiDefinitions,
    kpi_observations: master.kpiObservations,
    notification_subscriptions: master.notificationSubscriptions,
    notification_deliveries: master.notificationDeliveries,
    report_jobs: master.reportJobs,
    report_artifacts: master.reportArtifacts,
    integration_runs: master.integrationRuns,
    market_benchmark_facts: master.marketBenchmarkFacts,
    commercial_schemes: master.commercialSchemes,
    distributor_credit_accounts: master.distributorCreditAccounts,
    distributor_credit_snapshots: master.distributorCreditSnapshots,
    dealers: master.dealers,
    dealer_sku_weekly: master.dealerSkuWeekly,
    advance_ship_notices: master.advanceShipNotices,
    dispatch_milestones: master.dispatchMilestones,
    line_capacity_plans: master.lineCapacityPlans,
    capacity_expansion_plans: master.capacityExpansionPlans,
    production_execution_events: master.productionExecutionEvents,
    import_shipment_milestones: master.importShipmentMilestones,
    transfer_milestones: master.transferMilestones,
    reorder_recommendation_versions: master.reorderRecommendationVersions,
    reorder_decisions: master.reorderDecisions,
    inventory_scenario_versions: master.inventoryScenarioVersions,
    inventory_scenario_lines: master.inventoryScenarioLines,
    inventory_health_observations: master.inventoryHealthObservations,
    inventory_batches: master.inventoryBatches,
    inventory_batch_movements: master.inventoryBatchMovements,
    scenario_versions: master.scenarioVersions,
    scenario_assumption_sets: master.scenarioAssumptionSets,
    scenario_output_lines: master.scenarioOutputLines,
    financial_plan_versions: master.financialPlanVersions,
    budget_targets: master.budgetTargets,
    customer_invoices: master.customerInvoices,
    cash_receipts: master.cashReceipts,
    receivable_snapshots: master.receivableSnapshots,
    assistant_grounding_traces: master.assistantGroundingTraces,
  }
  Object.entries(collections).forEach(([name, rows]) => writeCollection(directory, name, rows))
}

main()
