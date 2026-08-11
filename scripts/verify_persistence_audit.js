const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')

for (const line of fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
  const index = line.indexOf('=')
  if (index > 0 && !line.trim().startsWith('#')) process.env[line.slice(0, index).trim()] = line.slice(index + 1).trim()
}

const baseUrl = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:3013'

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).filter((key) => key !== '_id').sort().map((key) => [key, normalize(value[key])]))
  }
  return value
}

function canonicalRows(rows) {
  return rows.map(normalize).map((row) => JSON.stringify(row)).sort()
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function get(apiPath) {
  const response = await fetch(`${baseUrl}${apiPath}`, { signal: AbortSignal.timeout(30_000) })
  assert(response.ok, `${apiPath}: HTTP ${response.status}`)
  return response.json()
}

async function inBatches(items, worker, size = 4) {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(worker))
  }
}

async function main() {
  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  try {
    const db = client.db(process.env.DB_NAME || 'supply_chain_app')
    const outputDir = path.resolve(process.cwd(), 'output')
    const files = fs.readdirSync(outputDir).filter((name) => name.endsWith('.json')).sort()
    await Promise.all(files.map(async (file) => {
      const collection = path.basename(file, '.json')
      const expected = JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf8'))
      const stored = await db.collection(collection).find({}).toArray()
      assert(JSON.stringify(canonicalRows(stored)) === JSON.stringify(canonicalRows(expected)), `${collection}: Mongo documents differ from ${file}`)
    }))
    console.log(`PASS: ${files.length} Mongo collections match output JSON exactly`)

    const catchAllPaths = [
      '/api/data/meta', '/api/data/skus', '/api/data/distributors', '/api/data/regions', '/api/data/weeks', '/api/data/kpis',
      '/api/data/weekly', '/api/data/aggregate?by=weekId', '/api/dashboard/plan-balance', '/api/dashboard/review-cycle',
      '/api/dashboard/alerts', '/api/scenarios', '/api/demand/factor-config', '/api/financial/config',
      '/api/demand/channel-integrations', '/api/demand/listings', '/api/demand/lifecycle', '/api/demand/npi-forecasts',
      '/api/demand/events', '/api/demand/inventory-norms', '/api/demand/consensus-workflows', '/api/inventory/policies',
      '/api/inventory/planning', '/api/orders/suggest?distributorId=DST-001', '/api/orders/dealer-activation-gap?distributorId=DST-001',
      '/api/orders/rules?simDay=26', '/api/orders/dispatch-visibility?distributorId=DST-001', '/api/orders?distributorId=DST-001',
      '/api/chat/insights', '/api/chat/suggestions', '/api/chat/health',
    ]
    await inBatches(catchAllPaths, get)
    console.log(`PASS: ${catchAllPaths.length} catch-all GET paths returned HTTP 200`)

    const supplyActions = [
      'overview', 'grid', 'bom&parentSku=SKU-BOAT-AD141', 'capacity', 'procurement', 'distribution', 'constraints', 'scenarios',
      'sku_detail&skuCode=SKU-BOAT-AD141', 'supplier_detail&supplierCode=SUP-001', 'plant_detail&plantCode=PLANT-NOIDA-01',
      'data_sources', 'rated_vs_actual_capacity', 'capacity_gap_analysis', 'rough_cut_production_plan&parentSku=SKU-BOAT-AD141',
      'capacity_recommendations', 'capacity_horizon_legend', 'early_warning_system', 'import_control_tower',
      'procurement_alignment', 'supplier_production_need_dates', 'po_hod_adherence', 'po_adherence_summary', 'odm_ems_master',
      'supplier_reliability_scorecard', 'root_cause_analysis', 'executive_recommendation_engine', 'consensus_production_plan_status',
    ]
    await inBatches(supplyActions, (action) => get(`/api/v1/supply-planning?action=${action}`))
    console.log(`PASS: ${supplyActions.length} Supply Planning GET actions returned HTTP 200`)

    const [meta, scenarios, financial, dispatch, sources, overview, lifecycle] = await Promise.all([
      get('/api/data/meta'), get('/api/v1/supply-planning?action=scenarios'), get('/api/financial/config'),
      get('/api/orders/dispatch-visibility?distributorId=DST-001'), get('/api/v1/supply-planning?action=data_sources'),
      get('/api/v1/supply-planning?action=overview'), get('/api/demand/lifecycle'),
    ])
    assert(meta.source === 'mongodb', `S&OP hydration source was ${meta.source}`)
    assert(scenarios.data.length === 1 && scenarios.data[0].costVarianceInr == null && scenarios.data[0].serviceLevelDelta == null && scenarios.data[0].revenueAtRiskRecovered == null, 'Scenario API does not match stored null outcomes')
    assert(financial.businessCategoryMap?.['TWS Earbuds'] === 'TWS', 'Financial category mapping is not served from persisted config')
    assert(dispatch.dataSource === 'dispatch_records', `Dispatch source was ${dispatch.dataSource}`)
    assert(sources.data.overallHealth === 'HEALTHY' && sources.data.categories.every((row) => row.sourceType === 'MONGO_COLLECTION'), 'Data-source lineage is not Mongo-backed and healthy')
    assert(overview.data.totalForecastUnits === 1621326 && overview.data.totalDeficitUnits === 1200 && overview.data.totalStockUnits === 193770, 'Overview totals diverge from the persisted baseline')
    const stages = Object.fromEntries(lifecycle.rows.map((row) => [row.skuId, row.stage]))
    assert(stages['SKU-BOAT-AD141'] === 'GROWTH' && stages['SKU-BOAT-LD100'] === 'NPI' && stages['SKU-BOAT-ST350'] === 'MATURITY', 'Lifecycle API diverges from persisted stages')

    console.log('PASS: live source, scenario, financial config, dispatch, lineage, overview, and lifecycle assertions')
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`)
  process.exit(1)
})
