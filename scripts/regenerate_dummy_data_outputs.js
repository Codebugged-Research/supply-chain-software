const fs = require('fs')
const path = require('path')
const vm = require('vm')

function loadFreshGenerator() {
  let source = fs.readFileSync(path.resolve(process.cwd(), 'lib', 'dummyData.js'), 'utf8')
  source = source.replace(/^import\s+[^\n]+\n/m, '').replace(/\bexport\s+/g, '')
  source += '\n;globalThis.__dummyDataExports = { getDataset };'
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
  const { getDataset } = loadFreshGenerator()
  const dataset = getDataset()
  const collections = {
    sop_regions: dataset.regions,
    sop_distributors: dataset.distributors,
    sop_skus: dataset.skus,
    sop_weeks: dataset.weeks,
    sop_planning_weeks: dataset.planningWeeks,
    sop_weekly: dataset.weekly,
    demand_lifecycle: dataset.lifecycle,
    demand_npi_forecasts: dataset.npiForecasts,
    demand_npi_readiness_items: dataset.npiReadinessItems,
    demand_event_templates: dataset.eventTemplates,
    demand_events: dataset.demandEvents,
    demand_inventory_norms: dataset.inventoryNorms,
  }
  Object.entries(collections).forEach(([name, rows]) => writeCollection(directory, name, rows))
}

main()
