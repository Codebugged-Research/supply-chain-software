const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')

for (const line of fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
  const index = line.indexOf('=')
  if (index > 0 && !line.trim().startsWith('#')) process.env[line.slice(0, index).trim()] = line.slice(index + 1).trim()
}

const outputDir = path.resolve(process.cwd(), 'output')
const load = (name) => JSON.parse(fs.readFileSync(path.join(outputDir, `${name}.json`), 'utf8'))
const insertMissingOnly = process.argv.includes('--insert-missing-only')
const collectionsOnly = process.argv.includes('--collections-only')
const optionValue = (name) => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}
const startAtCollection = optionValue('--start-at')
const stopAfterCollection = optionValue('--stop-after')

const keyedCollections = {
  sop_regions: (row) => ({ id: row.id }),
  sop_distributors: (row) => ({ id: row.id }),
  sop_skus: (row) => ({ id: row.id }),
  sop_weeks: (row) => ({ weekId: row.weekId }),
  sop_planning_weeks: (row) => ({ calendarVersionId: row.calendarVersionId, weekId: row.weekId }),
  sop_weekly: (row) => ({ skuId: row.skuId, distributorId: row.distributorId, weekId: row.weekId }),
  manufacturing_partners: (row) => ({ partnerId: row.partnerId }),
  manufacturing_partner_lines: (row) => ({ partnerId: row.partnerId, lineId: row.lineId, effectiveFromWeek: row.effectiveFromWeek }),
  supplier_master: (row) => ({ supplierCode: row.supplierCode }),
  supplier_product_mapping: (row) => ({ supplierCode: row.supplierCode, lineId: row.lineId, skuCode: row.skuCode }),
  purchase_orders: (row) => ({ poNumber: row.poNumber }),
  po_exclusions: (row) => ({ poNumber: row.poNumber, exclusionVersion: row.exclusionVersion }),
  po_revisions: (row) => ({ poNumber: row.poNumber, revisionNo: row.revisionNo }),
  po_adherence_observations: (row) => ({ observationId: row.observationId }),
  goods_receipt_inspections: (row) => ({ inspectionId: row.inspectionId }),
  forecast_vintages: (row) => ({ forecastId: row.forecastId }),
  forecast_accuracy_history: (row) => ({ accuracyId: row.accuracyId }),
  demand_channel_integrations: (row) => ({ distributorId: row.distributorId }),
  demand_listings: (row) => ({ listingId: row.listingId }),
  demand_lifecycle: (row) => ({ skuId: row.skuId }),
  demand_npi_forecasts: (row) => ({ npiId: row.npiId }),
  demand_npi_readiness_items: (row) => ({ npiId: row.npiId, gateCode: row.gateCode, itemCode: row.itemCode }),
  demand_event_templates: (row) => ({ eventTemplateId: row.eventTemplateId }),
  demand_events: (row) => ({ eventId: row.eventId, version: row.version }),
  demand_consensus_workflows: (row) => ({ workflowId: row.workflowId }),
  workflow_instances: (row) => ({ workflowId: row.workflowId }),
  workflow_steps: (row) => ({ workflowId: row.workflowId, stepSequence: row.stepSequence }),
  entity_audit_events: (row) => ({ auditId: row.auditId }),
  planning_calendar_versions: (row) => ({ calendarVersionId: row.calendarVersionId }),
  planning_weeks: (row) => ({ calendarVersionId: row.calendarVersionId, weekId: row.weekId }),
  lifecycle_transition_history: (row) => ({ transitionId: row.transitionId }),
  npi_products: (row) => ({ npiId: row.npiId }),
  npi_readiness_items: (row) => ({ npiId: row.npiId, gateCode: row.gateCode, itemCode: row.itemCode }),
  event_templates: (row) => ({ eventTemplateId: row.eventTemplateId }),
  channel_inventory_norms: (row) => ({ skuId: row.skuId, distributorId: row.distributorId, effectiveFromWeek: row.effectiveFromWeek, version: row.version }),
  factor_adjusted_demand_proposals: (row) => ({ proposalId: row.proposalId }),
  consensus_plan_versions: (row) => ({ planVersionId: row.planVersionId }),
  consensus_plan_lines: (row) => ({ planVersionId: row.planVersionId, skuId: row.skuId, weekId: row.weekId }),
  users: (row) => ({ userId: row.userId }),
  role_assignments: (row) => ({ assignmentId: row.assignmentId }),
  kpi_definitions: (row) => ({ kpiCode: row.kpiCode, effectiveFromWeek: row.effectiveFromWeek }),
  kpi_observations: (row) => ({ kpiCode: row.kpiCode, scopeType: row.scopeType, scopeId: row.scopeId, weekId: row.weekId, dataVersion: row.dataVersion }),
  notification_subscriptions: (row) => ({ subscriptionId: row.subscriptionId }),
  notification_deliveries: (row) => ({ notificationId: row.notificationId, recipientUserId: row.recipientUserId, channel: row.channel }),
  report_jobs: (row) => ({ jobId: row.jobId }),
  report_artifacts: (row) => ({ artifactId: row.artifactId }),
  integration_runs: (row) => ({ runId: row.runId }),
  market_benchmark_facts: (row) => ({ benchmarkId: row.benchmarkId }),
  commercial_schemes: (row) => ({ schemeId: row.schemeId, version: row.version }),
  distributor_credit_accounts: (row) => ({ distributorId: row.distributorId, effectiveFrom: row.effectiveFrom }),
  distributor_credit_snapshots: (row) => ({ distributorId: row.distributorId, asOfDate: row.asOfDate, dataVersion: row.dataVersion }),
  dealers: (row) => ({ dealerId: row.dealerId }),
  dealer_sku_weekly: (row) => ({ dealerId: row.dealerId, skuId: row.skuId, weekId: row.weekId, dataVersion: row.dataVersion }),
  advance_ship_notices: (row) => ({ asnId: row.asnId }),
  dispatch_milestones: (row) => ({ milestoneId: row.milestoneId }),
  line_capacity_plans: (row) => ({ capacityPlanVersionId: row.capacityPlanVersionId, lineId: row.lineId, weekId: row.weekId }),
  capacity_expansion_plans: (row) => ({ expansionId: row.expansionId }),
  production_execution_events: (row) => ({ executionEventId: row.executionEventId }),
  import_shipment_milestones: (row) => ({ milestoneId: row.milestoneId }),
  transfer_milestones: (row) => ({ milestoneId: row.milestoneId }),
  reorder_recommendation_versions: (row) => ({ recommendationVersionId: row.recommendationVersionId }),
  reorder_decisions: (row) => ({ decisionId: row.decisionId }),
  inventory_scenario_versions: (row) => ({ inventoryScenarioVersionId: row.inventoryScenarioVersionId }),
  inventory_scenario_lines: (row) => ({ inventoryScenarioVersionId: row.inventoryScenarioVersionId, skuId: row.skuId, locationId: row.locationId, weekId: row.weekId }),
  inventory_health_observations: (row) => ({ skuId: row.skuId, locationId: row.locationId, weekId: row.weekId, inventorySnapshotVersionId: row.inventorySnapshotVersionId }),
  inventory_batches: (row) => ({ batchId: row.batchId, locationId: row.locationId }),
  inventory_batch_movements: (row) => ({ movementId: row.movementId }),
  scenario_versions: (row) => ({ scenarioVersionId: row.scenarioVersionId }),
  scenario_assumption_sets: (row) => ({ assumptionSetId: row.assumptionSetId, assumptionCode: row.assumptionCode, scopeType: row.scopeType, scopeId: row.scopeId, effectiveWeek: row.effectiveWeek }),
  scenario_output_lines: (row) => ({ scenarioVersionId: row.scenarioVersionId, skuId: row.skuId, channelId: row.channelId, locationId: row.locationId, weekId: row.weekId }),
  financial_plan_versions: (row) => ({ financialPlanVersionId: row.financialPlanVersionId }),
  budget_targets: (row) => ({ financialPlanVersionId: row.financialPlanVersionId, skuId: row.skuId, channelId: row.channelId, periodId: row.periodId, measureCode: row.measureCode }),
  customer_invoices: (row) => ({ invoiceId: row.invoiceId }),
  cash_receipts: (row) => ({ receiptId: row.receiptId }),
  receivable_snapshots: (row) => ({ invoiceId: row.invoiceId, asOfDate: row.asOfDate, dataVersion: row.dataVersion }),
  assistant_grounding_traces: (row) => ({ traceId: row.traceId }),
  dashboard_review_cycles: (row) => ({ cycleId: row.cycleId }),
  dashboard_alerts: (row) => ({ alertId: row.alertId }),
  inventory_policies: (row) => ({ policyId: row.policyId }),
  order_suggestions: (row) => ({ 'distributor.id': row.distributor.id }),
  dealer_activation_gaps: (row) => ({ 'distributor.id': row.distributor.id }),
  order_rules: (row) => ({ ruleId: row.ruleId }),
  planning_rules: (row) => ({ ruleId: row.ruleId }),
  dispatch_records: (row) => ({ dispatchId: row.dispatchId }),
  chat_suggestions: (row) => ({ suggestionId: row.suggestionId }),
  import_shipments: (row) => ({ shipmentId: row.shipmentId }),
  early_warnings: (row) => ({ warningId: row.warningId }),
  root_cause_analyses: (row) => ({ issueId: row.issueId }),
  executive_recommendations: (row) => ({ recommendationId: row.recommendationId }),
  consensus_production_plans: (row) => ({ planId: row.planId }),
  po_adherence_history: (row) => ({ window: row.window }),
  supplier_reliability_history: (row) => ({ partnerId: row.partnerId, measurementWeek: row.measurementWeek, windowWeeks: row.windowWeeks, dataVersion: row.dataVersion }),
  data_source_logs: (row) => ({ sourceId: row.sourceId }),
  financial_planning_config: (row) => ({ configId: row.configId }),
  demand_factor_config: (row) => ({ configId: row.configId }),
}

async function upsertRows(db, collectionName, rows, keyFor) {
  const collection = db.collection(collectionName)
  const operations = rows.map((row) => {
    const value = { ...row }
    delete value._id
    if (insertMissingOnly) {
      return { updateOne: { filter: keyFor(value), update: { $setOnInsert: value }, upsert: true } }
    }
    return { replaceOne: { filter: keyFor(value), replacement: value, upsert: true } }
  })
  const batchSize = 500
  for (let offset = 0; offset < operations.length; offset += batchSize) {
    const batch = operations.slice(offset, offset + batchSize)
    for (let attempt = 1; ; attempt++) {
      try {
        await collection.bulkWrite(batch, { ordered: false })
        break
      } catch (error) {
        const retryable = ['ECONNRESET', 'ETIMEDOUT', 'MaxTimeMSExpired'].some((code) => error.code === code || error.codeName === code || String(error.message).includes(code))
        if (!retryable || attempt >= 5) throw error
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
      }
    }
  }
  console.log(`${insertMissingOnly ? 'inserted missing keys for' : 'upserted'} ${collectionName}: ${rows.length}`)
}

async function main() {
  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  try {
    const db = client.db(process.env.DB_NAME || 'supply_chain_app')
    // Large regenerated history collections need their natural keys indexed;
    // otherwise each upsert degrades into a full collection scan.
    await Promise.all([
      db.collection('forecast_vintages').createIndex({ forecastId: 1 }, { name: 'idx_forecast_id' }),
      db.collection('forecast_accuracy_history').createIndex({ accuracyId: 1 }, { name: 'idx_accuracy_id' }),
    ])
    let entries = Object.entries(keyedCollections)
    if (startAtCollection) {
      const startIndex = entries.findIndex(([name]) => name === startAtCollection)
      if (startIndex < 0) throw new Error(`Unknown --start-at collection ${startAtCollection}`)
      entries = entries.slice(startIndex)
    }
    if (stopAfterCollection) {
      const stopIndex = entries.findIndex(([name]) => name === stopAfterCollection)
      if (stopIndex < 0) throw new Error(`Unknown --stop-after collection ${stopAfterCollection}`)
      entries = entries.slice(0, stopIndex + 1)
    }
    for (const [collectionName, keyFor] of entries) {
      await upsertRows(db, collectionName, load(collectionName), keyFor)
    }

    // The safe gate-migration mode is intentionally insert-only. It must not
    // fall through to legacy cleanup, deletes, or updates below.
    if (insertMissingOnly || collectionsOnly) return

    await db.collection('early_warnings').deleteMany({ warningId: { $in: ['EW-CAP-NOIDA-W34', 'EW-SUP-DIXON-W36', 'EW-INV-DELHI-W34', 'EW-PROD-CHENNAI-W35', 'EW-TRF-BLR-W36'] } })
    await db.collection('root_cause_analyses').deleteMany({ issueId: { $in: ['RCA-INV-2026-W34', 'RCA-PROD-2026-W35', 'RCA-CAP-2026-W34', 'RCA-SUP-2026-W36', 'RCA-TRF-2026-W36'] } })
    await db.collection('executive_recommendations').deleteMany({ recommendationId: { $in: ['EXEC-REC-01', 'EXEC-REC-02', 'EXEC-REC-03'] } })
    await db.collection('dashboard_alerts').deleteMany({ alertId: { $in: ['EW-CAP-NOIDA-W34', 'EW-SUP-DIXON-W36', 'EW-INV-DELHI-W34', 'EW-PROD-CHENNAI-W35', 'EW-TRF-BLR-W36'] } })
    console.log('removed exact stale synthetic intelligence IDs from the audit')

    const wrongOrder = await db.collection('orders').findOne({ orderId: 'ORD-7F578BB4' })
    if (wrongOrder) {
      await db.collection('orders').deleteOne({ orderId: 'ORD-7F578BB4' })
      console.log('deleted audited wrong-domain order: ORD-7F578BB4')
    }
    await upsertRows(db, 'orders', load('orders'), (row) => ({ orderId: row.orderId }))

    await db.collection('purchase_orders').bulkWrite(load('purchase_orders').map((row) => ({ updateOne: {
      filter: { poNumber: row.poNumber },
      update: { $set: { handoverDate: row.handoverDate, actualDeliveryDate: row.actualDeliveryDate } },
    } })), { ordered: false })
    console.log('updated purchase_orders persistence fields: 48')

    await db.collection('supplier_master').bulkWrite(load('supplier_master').map((row) => ({ updateOne: {
      filter: { supplierCode: row.supplierCode },
      update: { $set: {
          vendorType: row.vendorType,
          tierClassification: row.tierClassification,
          contractedCapacityUnitsPerWeek: row.contractedCapacityUnitsPerWeek,
          spotCapacityUnitsPerWeek: row.spotCapacityUnitsPerWeek,
          npiRampCapacityUnitsPerWeek: row.npiRampCapacityUnitsPerWeek,
      } },
    } })), { ordered: false })
    console.log('updated supplier_master persistence fields: 4')

    await db.collection('what_if_scenarios').bulkWrite(load('what_if_scenarios').map((row) => ({ updateOne: {
      filter: { scenarioName: row.scenarioName },
      update: { $set: { costVarianceInr: row.costVarianceInr, serviceLevelDelta: row.serviceLevelDelta, revenueAtRiskRecovered: row.revenueAtRiskRecovered } },
    } })), { ordered: false })
    await db.collection('supply_constraints').bulkWrite(load('supply_constraints').map((row) => ({ updateOne: {
      filter: { skuCode: row.skuCode, constraintType: row.constraintType, constraintSource: row.constraintSource },
      update: { $set: { revenueAtRiskInr: row.revenueAtRiskInr } },
    } })), { ordered: false })
    console.log('updated flagged scenario and constraint fields')
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
