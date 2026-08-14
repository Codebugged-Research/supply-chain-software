const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')

for (const line of fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
  const index = line.indexOf('=')
  if (index > 0 && !line.trim().startsWith('#')) process.env[line.slice(0, index).trim()] = line.slice(index + 1).trim()
}

const registry = {
  planning_calendar_versions: ['calendarVersionId'], planning_weeks: ['calendarVersionId', 'weekId'],
  sop_skus: ['id'], lifecycle_transition_history: ['transitionId'], npi_products: ['npiId'],
  npi_readiness_items: ['npiId', 'gateCode', 'itemCode'], event_templates: ['eventTemplateId'], demand_events: ['eventId', 'version'],
  forecast_vintages: ['forecastId'], forecast_accuracy_history: ['accuracyId'], factor_adjusted_demand_proposals: ['proposalId'],
  workflow_instances: ['workflowId'], workflow_steps: ['workflowId', 'stepSequence'], entity_audit_events: ['auditId'],
  consensus_plan_versions: ['planVersionId'], consensus_plan_lines: ['planVersionId', 'skuId', 'weekId'],
  kpi_definitions: ['kpiCode', 'effectiveFromWeek'], kpi_observations: ['kpiCode', 'scopeType', 'scopeId', 'weekId', 'dataVersion'],
  users: ['userId'], role_assignments: ['assignmentId'], notification_subscriptions: ['subscriptionId'],
  notification_deliveries: ['notificationId', 'recipientUserId', 'channel'], report_jobs: ['jobId'], report_artifacts: ['artifactId'],
  integration_runs: ['runId'], market_benchmark_facts: ['benchmarkId'], channel_inventory_norms: ['skuId', 'distributorId', 'effectiveFromWeek', 'version'],
  commercial_schemes: ['schemeId', 'version'], distributor_credit_accounts: ['distributorId', 'effectiveFrom'],
  distributor_credit_snapshots: ['distributorId', 'asOfDate', 'dataVersion'], dealers: ['dealerId'],
  dealer_sku_weekly: ['dealerId', 'skuId', 'weekId', 'dataVersion'], advance_ship_notices: ['asnId'], dispatch_milestones: ['milestoneId'],
  supplier_master: ['supplierCode'], manufacturing_partners: ['partnerId'], manufacturing_partner_lines: ['partnerId', 'lineId', 'effectiveFromWeek'],
  supplier_reliability_history: ['partnerId', 'measurementWeek', 'windowWeeks', 'dataVersion'], purchase_orders: ['poNumber'],
  po_exclusions: ['poNumber', 'exclusionVersion'], po_revisions: ['poNumber', 'revisionNo'], po_adherence_observations: ['observationId'],
  line_capacity_plans: ['capacityPlanVersionId', 'lineId', 'weekId'], capacity_expansion_plans: ['expansionId'],
  production_execution_events: ['executionEventId'], goods_receipt_inspections: ['inspectionId'], import_shipment_milestones: ['milestoneId'],
  transfer_milestones: ['milestoneId'], reorder_recommendation_versions: ['recommendationVersionId'], reorder_decisions: ['decisionId'],
  inventory_scenario_versions: ['inventoryScenarioVersionId'], inventory_scenario_lines: ['inventoryScenarioVersionId', 'skuId', 'locationId', 'weekId'],
  inventory_health_observations: ['skuId', 'locationId', 'weekId', 'inventorySnapshotVersionId'], inventory_batches: ['batchId', 'locationId'],
  inventory_batch_movements: ['movementId'], scenario_versions: ['scenarioVersionId'],
  scenario_assumption_sets: ['assumptionSetId', 'assumptionCode', 'scopeType', 'scopeId', 'effectiveWeek'],
  scenario_output_lines: ['scenarioVersionId', 'skuId', 'channelId', 'locationId', 'weekId'], financial_plan_versions: ['financialPlanVersionId'],
  budget_targets: ['financialPlanVersionId', 'skuId', 'channelId', 'periodId', 'measureCode'], customer_invoices: ['invoiceId'],
  cash_receipts: ['receiptId'], receivable_snapshots: ['invoiceId', 'asOfDate', 'dataVersion'], assistant_grounding_traces: ['traceId'],
}

const commonProvenanceExempt = new Set(['supplier_master'])
const keyOf = (row, fields) => fields.map((field) => JSON.stringify(row[field])).join('|')
const hasValue = (row, field) => Object.prototype.hasOwnProperty.call(row, field) && row[field] !== undefined && row[field] !== null

async function main() {
  const client = new MongoClient(process.env.MONGO_URL, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000, socketTimeoutMS: 120000 })
  await client.connect()
  try {
    const db = client.db(process.env.DB_NAME || 'supply_chain_app')
    const results = []
    for (const [collection, keyFields] of Object.entries(registry)) {
      const outputFile = path.resolve(process.cwd(), 'output', `${collection}.json`)
      if (!fs.existsSync(outputFile)) {
        results.push({ collection, status: 'FAIL', issue: 'missing generated output' })
        continue
      }
      const expected = JSON.parse(fs.readFileSync(outputFile, 'utf8'))
      const stored = await db.collection(collection).find({}).project({ _id: 0 }).toArray()
      const storedKeys = new Set(stored.map((row) => keyOf(row, keyFields)))
      const expectedKeys = expected.map((row) => keyOf(row, keyFields))
      const uniqueExpected = new Set(expectedKeys)
      const missingKeys = expectedKeys.filter((key) => !storedKeys.has(key))
      const invalidKeys = expected.filter((row) => keyFields.some((field) => !hasValue(row, field)))
      const missingProvenance = commonProvenanceExempt.has(collection) ? [] : expected.filter((row) => row.dataVersion !== 'DM-2026-W33-V1' || row.generationSeed !== 20250701)
      results.push({
        collection, expected: expected.length, stored: stored.length, uniqueExpected: uniqueExpected.size,
        missingKeys: missingKeys.length, invalidKeys: invalidKeys.length, missingProvenance: missingProvenance.length,
        status: expected.length > 0 && uniqueExpected.size === expected.length && missingKeys.length === 0 && invalidKeys.length === 0 && missingProvenance.length === 0 ? 'DB-verified' : 'FAIL',
      })
    }

    const byName = Object.fromEntries(await Promise.all(Object.keys(registry).map(async (name) => [name, await db.collection(name).find({}).project({ _id: 0 }).toArray()])))
    const integrity = [
      { check: 'planning window is 157 unique weeks', pass: byName.planning_weeks.length >= 157 && new Set(byName.planning_weeks.map((row) => `${row.calendarVersionId}|${row.weekId}`)).size >= 157 },
      { check: 'NPI has no pre-launch actuals', pass: !byName.npi_products.some((npi) => byName.dealer_sku_weekly.some((row) => row.skuId === npi.skuId && row.weekId < npi.launchWeek)) },
      { check: 'forecast accuracy stores forecast and actual', pass: byName.forecast_accuracy_history.every((row) => Number.isFinite(row.forecastQty) && Number.isFinite(row.actualQty)) },
      { check: 'all workflow subjects have ordered steps', pass: byName.workflow_instances.every((workflow) => byName.workflow_steps.some((step) => step.workflowId === workflow.workflowId)) },
      { check: 'Demand and Production share audit collection', pass: ['DEMAND_CONSENSUS', 'PRODUCTION_SIGNOFF'].every((type) => byName.entity_audit_events.some((event) => event.workflowType === type)) },
      { check: 'partner capacity reconciles', pass: byName.manufacturing_partners.every((partner) => partner.contractedCapacityUnitsPerWeek + partner.spotCapacityUnitsPerWeek === partner.totalCapacityUnitsPerWeek) },
      { check: 'PO handover dates retain legal state', pass: byName.purchase_orders.filter((po) => po.dataVersion === 'DM-2026-W33-V1').every((po) => (po.status === 'CLOSED') === Boolean(po.actualHandoverDate)) },
      { check: 'capacity arithmetic reconciles', pass: byName.line_capacity_plans.every((row) => row.availableCapacityQty === Math.max(0, row.contractedCapacityQty + row.spotCapacityQty + row.expansionGainQty - row.maintenanceLossQty - row.shutdownLossQty) && row.remainingCapacityQty === Math.max(0, row.availableCapacityQty - row.allocatedProductionQty)) },
      { check: 'inventory scenario identity reconciles', pass: byName.inventory_scenario_lines.every((row) => row.closingQty === Math.max(0, row.openingQty + row.receiptsQty - row.fulfilledQty)) },
      { check: 'invoice amounts reconcile', pass: byName.customer_invoices.every((row) => row.netAmountPaise === row.grossAmountPaise - row.discountPaise + row.taxPaise) },
      { check: 'receipt allocations do not exceed receipt', pass: byName.cash_receipts.every((row) => (row.allocations || []).reduce((sum, allocation) => sum + allocation.allocatedAmountPaise, 0) <= row.amountPaise) },
    ]

    const failures = results.filter((row) => row.status !== 'DB-verified')
    const report = { checkedAt: new Date().toISOString(), database: process.env.DB_NAME || 'supply_chain_app', collections: results, integrity }
    const reportFile = path.resolve(process.cwd(), 'docs', 'data', 'DATA_MODEL_DB_VERIFICATION.json')
    fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`)
    console.log(`DATA_MODEL_MASTER verification: ${results.length - failures.length}/${results.length} collections DB-verified; ${integrity.filter((check) => check.pass).length}/${integrity.length} integrity checks passed.`)
    console.log(`Evidence: ${reportFile}`)
    if (failures.length || integrity.some((check) => !check.pass)) process.exitCode = 1
  } finally {
    await client.close()
  }
}

main().catch((error) => { console.error(error); process.exit(1) })
