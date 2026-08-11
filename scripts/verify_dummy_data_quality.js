const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { MongoClient } = require('mongodb')

for (const line of fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
  const index = line.indexOf('=')
  if (index > 0 && !line.trim().startsWith('#')) process.env[line.slice(0, index).trim()] = line.slice(index + 1).trim()
}

const sha256 = (value) => crypto.createHash('sha256').update(Buffer.from(JSON.stringify(value))).digest('hex')
const withoutIds = (rows) => rows.map((row) => {
  const copy = { ...row }
  delete copy._id
  return copy
})

function loadFreshDummyDataModule(DateImplementation = Date) {
  let source = fs.readFileSync(path.resolve(process.cwd(), 'lib', 'dummyData.js'), 'utf8')
  source = source.replace(/^import\s+[^\n]+\n/m, '').replace(/\bexport\s+/g, '')
  source += '\n;globalThis.__qualityExports = { REGIONS, DISTRIBUTORS, SKUS, getDataset, suggestOrders, buildDealerActivationGap, buildDispatchVisibilityRows };'
  const context = vm.createContext({ console, Date: DateImplementation, Math, Set, Map, Object, Array, Number, String, Boolean, JSON })
  vm.runInContext(source, context, { filename: 'lib/dummyData.js' })
  return context.__qualityExports
}

function fixedDate(iso) {
  const timestamp = new Date(iso).getTime()
  return class FixedDate extends Date {
    constructor(...args) { super(args.length ? args[0] : timestamp) }
    static now() { return timestamp }
  }
}

function firstDifference(left, right, location = '$') {
  if (Object.is(left, right)) return null
  if (typeof left !== typeof right) return `${location}: ${typeof left} != ${typeof right}`
  if (left == null || right == null) return `${location}: ${JSON.stringify(left)} != ${JSON.stringify(right)}`
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return `${location}: array type mismatch`
    if (left.length !== right.length) return `${location}.length: ${left.length} != ${right.length}`
    for (let index = 0; index < left.length; index++) {
      const difference = firstDifference(left[index], right[index], `${location}[${index}]`)
      if (difference) return difference
    }
    return null
  }
  if (typeof left === 'object') {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    if (JSON.stringify(leftKeys) !== JSON.stringify(rightKeys)) return `${location} keys: ${JSON.stringify(leftKeys)} != ${JSON.stringify(rightKeys)}`
    for (const key of leftKeys) {
      const difference = firstDifference(left[key], right[key], `${location}.${key}`)
      if (difference) return difference
    }
    return null
  }
  return `${location}: ${JSON.stringify(left)} != ${JSON.stringify(right)}`
}

function exactComparison(label, generated, stored) {
  const generatedBytes = Buffer.from(JSON.stringify(generated))
  const storedBytes = Buffer.from(JSON.stringify(stored))
  return {
    label,
    pass: generatedBytes.equals(storedBytes),
    generatedBytes: generatedBytes.length,
    storedBytes: storedBytes.length,
    generatedSha256: sha256(generated),
    storedSha256: sha256(stored),
    firstDifference: firstDifference(generated, stored),
  }
}

function walk(value, visitor, location = '$') {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, visitor, `${location}[${index}]`))
  if (!value || typeof value !== 'object') return
  visitor(value, location)
  for (const [key, child] of Object.entries(value)) walk(child, visitor, `${location}.${key}`)
}

async function main() {
  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  try {
    const db = client.db(process.env.DB_NAME || 'supply_chain_app')
    const collectionNames = (await db.listCollections({}, { nameOnly: true }).toArray()).map((row) => row.name).sort()
    const allCollections = Object.fromEntries(await Promise.all(collectionNames.map(async (name) => [name, await db.collection(name).find({}).toArray()])))

    const explicitCounts = {
      sop_regions: 3,
      sop_distributors: 5,
      sop_skus: 15,
      sop_weeks: 26,
      sop_weekly: 15 * 5 * 26,
      demand_channel_integrations: 5,
      demand_listings: 15 * 5,
      demand_lifecycle: 15,
      demand_npi_forecasts: 2,
      demand_events: 3,
      demand_inventory_norms: 15 * 5,
      demand_consensus_workflows: 5,
      inventory_policies: 15,
      order_suggestions: 5,
      dealer_activation_gaps: 5,
    }
    const countChecks = Object.entries(explicitCounts).map(([collection, expected]) => ({
      collection,
      expected,
      actual: allCollections[collection]?.length ?? 0,
      pass: (allCollections[collection]?.length ?? 0) === expected,
    }))

    const outputDir = path.resolve(process.cwd(), 'output')
    const outputCountChecks = fs.readdirSync(outputDir).filter((name) => name.endsWith('.json')).sort().map((file) => {
      const collection = path.basename(file, '.json')
      const value = JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf8'))
      const expected = Array.isArray(value) ? value.length : 1
      const actual = allCollections[collection]?.length ?? 0
      return { collection, expected, actual, pass: actual === expected }
    })

    const structuralChecks = [
      { name: 'sop_weekly unique SKU-distributor-week keys', expected: 1950, actual: new Set((allCollections.sop_weekly || []).map((row) => `${row.skuId}|${row.distributorId}|${row.weekId}`)).size },
      { name: 'order suggestion nested SKU lines', expected: 75, actual: (allCollections.order_suggestions || []).reduce((sum, row) => sum + (row.lines?.length || 0), 0) },
      { name: 'dealer activation nested SKU rows', expected: 75, actual: (allCollections.dealer_activation_gaps || []).reduce((sum, row) => sum + (row.rows?.length || 0), 0) },
    ].map((check) => ({ ...check, pass: check.actual === check.expected }))

    const impossible = []
    const stockKey = /(stock|inventory|onhand|availableqty|closingqty|openingqty)/i
    const fillRateKey = /(fill.?rate|fulfil.?rate)/i
    const priceCostPairs = [
      ['price', 'cost'], ['unitPrice', 'unitCost'], ['sellingPrice', 'unitCost'],
      ['averageSellingPrice', 'landedCost'], ['mrp', 'landedCost'], ['purchasePrice', 'manufacturingCost'],
    ]
    for (const [collection, rows] of Object.entries(allCollections)) {
      rows.forEach((row, documentIndex) => walk(row, (object, location) => {
        for (const [key, value] of Object.entries(object)) {
          if (typeof value === 'number' && stockKey.test(key) && value < 0) impossible.push({ type: 'negative_stock', collection, documentIndex, location: `${location}.${key}`, value })
          if (typeof value === 'number' && fillRateKey.test(key)) {
            const normalizedValue = /pct|percent/i.test(key) ? value / 100 : value
            if (normalizedValue < 0 || normalizedValue > 1) impossible.push({ type: 'fill_rate_out_of_bounds', collection, documentIndex, location: `${location}.${key}`, value, normalizedValue, expectedRange: '[0,1]' })
          }
        }
        for (const [priceKey, costKey] of priceCostPairs) {
          if (typeof object[priceKey] === 'number' && typeof object[costKey] === 'number' && object[priceKey] < object[costKey]) {
            impossible.push({ type: 'price_below_cost', collection, documentIndex, location, priceKey, price: object[priceKey], costKey, cost: object[costKey] })
          }
        }
      }, `$[${documentIndex}]`))
    }

    const policies = withoutIds(allCollections.inventory_policies || []).sort((a, b) => b.consumptionValue - a.consumptionValue)
    const totalConsumption = policies.reduce((sum, row) => sum + Number(row.consumptionValue || 0), 0) || 1
    let cumulative = 0
    const classificationChecks = policies.map((row) => {
      cumulative += Number(row.consumptionValue || 0)
      const cumulativePct = cumulative / totalConsumption * 100
      const expectedAbc = cumulativePct <= 80 ? 'A' : cumulativePct <= 95 ? 'B' : 'C'
      const expectedXyz = row.demandCv <= 0.25 ? 'X' : row.demandCv <= 0.5 ? 'Y' : 'Z'
      const pass = ['A', 'B', 'C'].includes(row.abcClass) && ['X', 'Y', 'Z'].includes(row.xyzClass) && Number.isFinite(row.demandCv) && row.demandCv >= 0 && row.abcClass === expectedAbc && row.xyzClass === expectedXyz
      return { skuId: row.skuId, abcClass: row.abcClass, expectedAbc, xyzClass: row.xyzClass, expectedXyz, demandCv: row.demandCv, cumulativePct: Number(cumulativePct.toFixed(3)), pass }
    })

    const first = loadFreshDummyDataModule()
    const second = loadFreshDummyDataModule()
    const firstDataset = first.getDataset()
    const secondDataset = second.getDataset()
    const generatedBase = {
      regions: first.REGIONS,
      distributors: first.DISTRIBUTORS,
      skus: first.SKUS,
      weeks: firstDataset.weeks,
      weekly: firstDataset.weekly,
    }
    const secondBase = {
      regions: second.REGIONS,
      distributors: second.DISTRIBUTORS,
      skus: second.SKUS,
      weeks: secondDataset.weeks,
      weekly: secondDataset.weekly,
    }
    const storedBase = {
      regions: withoutIds(allCollections.sop_regions || []),
      distributors: withoutIds(allCollections.sop_distributors || []),
      skus: withoutIds(allCollections.sop_skus || []),
      weeks: withoutIds(allCollections.sop_weeks || []),
      weekly: withoutIds(allCollections.sop_weekly || []),
    }
    const generatedSuggestions = first.DISTRIBUTORS.map((row) => first.suggestOrders(row.id))
    const regeneratedSuggestions = second.DISTRIBUTORS.map((row) => second.suggestOrders(row.id))
    const generatedGaps = first.DISTRIBUTORS.map((row) => first.buildDealerActivationGap(row.id))
    const regeneratedGaps = second.DISTRIBUTORS.map((row) => second.buildDealerActivationGap(row.id))
    const orders = withoutIds(allCollections.orders || [])
    const generatedDispatch = orders.flatMap((order) => first.buildDispatchVisibilityRows(order.distributorId, (order.lines || []).map((line) => ({ skuId: line.skuId, skuName: line.skuName, orderedQty: line.qty }))).map((row) => ({ orderId: order.orderId, ...row })))
    const regeneratedDispatch = orders.flatMap((order) => second.buildDispatchVisibilityRows(order.distributorId, (order.lines || []).map((line) => ({ skuId: line.skuId, skuName: line.skuName, orderedQty: line.qty }))).map((row) => ({ orderId: order.orderId, ...row })))
    const dispatchValueFields = ({ orderId, skuId, skuName, orderedQty, dispatchedQty, gap, status, fillRatePct }) => ({ orderId, skuId, skuName, orderedQty, dispatchedQty, gap, status, fillRatePct })
    const dayOne = loadFreshDummyDataModule(fixedDate('2026-08-11T00:00:00.000Z'))
    const dayTwo = loadFreshDummyDataModule(fixedDate('2026-08-12T00:00:00.000Z'))
    dayOne.getDataset()
    dayTwo.getDataset()
    const dayOneSuggestions = dayOne.DISTRIBUTORS.map((row) => dayOne.suggestOrders(row.id))
    const dayTwoSuggestions = dayTwo.DISTRIBUTORS.map((row) => dayTwo.suggestOrders(row.id))

    const determinismChecks = [
      exactComparison('full getDataset run 1 vs run 2 (includes metadata)', firstDataset, secondDataset),
      exactComparison('fresh generator run 1 vs fresh generator run 2 (base)', generatedBase, secondBase),
      exactComparison('fresh generator base vs Mongo sop_* collections', generatedBase, storedBase),
      exactComparison('fresh order suggestions run 1 vs run 2', generatedSuggestions, regeneratedSuggestions),
      exactComparison('fresh order suggestions vs Mongo', generatedSuggestions, withoutIds(allCollections.order_suggestions || [])),
      exactComparison('order suggestions regenerated on adjacent dates', dayOneSuggestions, dayTwoSuggestions),
      exactComparison('fresh dealer activation run 1 vs run 2', generatedGaps, regeneratedGaps),
      exactComparison('fresh dealer activation vs Mongo', generatedGaps, withoutIds(allCollections.dealer_activation_gaps || [])),
      exactComparison('fresh dispatch simulation run 1 vs run 2', generatedDispatch, regeneratedDispatch),
      exactComparison('fresh dispatch simulation vs Mongo dispatch_records', generatedDispatch, withoutIds(allCollections.dispatch_records || [])),
      exactComparison('fresh dispatch business values vs Mongo dispatch_records', generatedDispatch.map(dispatchValueFields), withoutIds(allCollections.dispatch_records || []).map(dispatchValueFields)),
    ]

    const result = {
      auditedAt: new Date().toISOString(),
      database: process.env.DB_NAME || 'supply_chain_app',
      collectionCount: collectionNames.length,
      documentCount: Object.values(allCollections).reduce((sum, rows) => sum + rows.length, 0),
      counts: { explicit: countChecks, outputParity: outputCountChecks, structural: structuralChecks },
      impossibleValues: impossible,
      classificationChecks,
      determinismChecks,
    }
    result.pass = countChecks.every((row) => row.pass) && outputCountChecks.every((row) => row.pass) && structuralChecks.every((row) => row.pass) && impossible.length === 0 && classificationChecks.every((row) => row.pass) && determinismChecks.every((row) => row.pass)
    console.log(JSON.stringify({
      auditedAt: result.auditedAt,
      database: result.database,
      collectionCount: result.collectionCount,
      documentCount: result.documentCount,
      pass: result.pass,
      counts: {
        explicit: countChecks,
        outputParity: { checked: outputCountChecks.length, failed: outputCountChecks.filter((row) => !row.pass) },
        structural: structuralChecks,
      },
      impossibleValues: impossible,
      classifications: { checked: classificationChecks.length, failed: classificationChecks.filter((row) => !row.pass) },
      determinismChecks,
    }, null, 2))
    process.exitCode = result.pass ? 0 : 2
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
