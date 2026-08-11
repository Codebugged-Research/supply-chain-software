const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')

for (const line of fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
  const index = line.indexOf('=')
  if (index > 0 && !line.trim().startsWith('#')) process.env[line.slice(0, index).trim()] = line.slice(index + 1).trim()
}

const outputDir = path.resolve(process.cwd(), 'output')
const load = (name) => JSON.parse(fs.readFileSync(path.join(outputDir, `${name}.json`), 'utf8'))

const keyedCollections = {
  sop_regions: (row) => ({ id: row.id }),
  sop_distributors: (row) => ({ id: row.id }),
  sop_skus: (row) => ({ id: row.id }),
  sop_weeks: (row) => ({ weekId: row.weekId }),
  sop_planning_weeks: (row) => ({ calendarVersionId: row.calendarVersionId, weekId: row.weekId }),
  sop_weekly: (row) => ({ skuId: row.skuId, distributorId: row.distributorId, weekId: row.weekId }),
  demand_channel_integrations: (row) => ({ distributorId: row.distributorId }),
  demand_listings: (row) => ({ listingId: row.listingId }),
  demand_lifecycle: (row) => ({ skuId: row.skuId }),
  demand_npi_forecasts: (row) => ({ npiId: row.npiId }),
  demand_npi_readiness_items: (row) => ({ npiId: row.npiId, gateCode: row.gateCode, itemCode: row.itemCode }),
  demand_event_templates: (row) => ({ eventTemplateId: row.eventTemplateId }),
  demand_events: (row) => ({ eventId: row.eventId }),
  demand_inventory_norms: (row) => ({ normId: row.normId }),
  demand_consensus_workflows: (row) => ({ workflowId: row.workflowId }),
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
  supplier_reliability_history: (row) => ({ supplierCode: row.supplierCode }),
  data_source_logs: (row) => ({ sourceId: row.sourceId }),
  financial_planning_config: (row) => ({ configId: row.configId }),
  demand_factor_config: (row) => ({ configId: row.configId }),
}

async function upsertRows(db, collectionName, rows, keyFor) {
  const collection = db.collection(collectionName)
  const operations = rows.map((row) => {
    const value = { ...row }
    delete value._id
    return { replaceOne: { filter: keyFor(value), replacement: value, upsert: true } }
  })
  if (operations.length) await collection.bulkWrite(operations, { ordered: false })
  console.log(`upserted ${collectionName}: ${rows.length}`)
}

async function main() {
  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  try {
    const db = client.db(process.env.DB_NAME || 'supply_chain_app')
    for (const [collectionName, keyFor] of Object.entries(keyedCollections)) {
      await upsertRows(db, collectionName, load(collectionName), keyFor)
    }

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
