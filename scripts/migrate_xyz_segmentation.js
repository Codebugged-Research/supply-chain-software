const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')

for (const line of fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
  const index = line.indexOf('=')
  if (index > 0 && !line.trim().startsWith('#')) process.env[line.slice(0, index).trim()] = line.slice(index + 1).trim()
}

const load = (name) => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'output', `${name}.json`), 'utf8'))

async function replaceRows(collection, rows, keyFor) {
  const operations = rows.map((row) => ({ replaceOne: {
    filter: keyFor(row),
    replacement: row,
    upsert: true,
  } }))
  await collection.bulkWrite(operations, { ordered: false })
}

async function main() {
  const weekly = load('sop_weekly')
  const policies = load('inventory_policies')
  const skus = load('sop_skus')
  const distributors = load('sop_distributors')
  const weeks = load('sop_weeks')
  const expectedWeeklyRows = skus.length * distributors.length * weeks.length
  if (weekly.length !== expectedWeeklyRows) throw new Error(`Expected ${expectedWeeklyRows.toLocaleString()} sop_weekly rows, received ${weekly.length}`)
  if (policies.length !== skus.length) throw new Error(`Expected ${skus.length} inventory policies, received ${policies.length}`)

  const xyzMix = Object.fromEntries(['X', 'Y', 'Z'].map((xyzClass) => [xyzClass, policies.filter((row) => row.xyzClass === xyzClass).length]))
  if (!xyzMix.X || !xyzMix.Y || !xyzMix.Z) throw new Error(`Refusing migration: invalid XYZ mix ${JSON.stringify(xyzMix)}`)

  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  try {
    const db = client.db(process.env.DB_NAME || 'supply_chain_app')
    await replaceRows(db.collection('sop_weekly'), weekly, (row) => ({ skuId: row.skuId, distributorId: row.distributorId, weekId: row.weekId }))
    await replaceRows(db.collection('inventory_policies'), policies, (row) => ({ policyId: row.policyId }))

    const storedPolicies = await db.collection('inventory_policies').find({}).project({ _id: 0, skuId: 1, xyzClass: 1, demandCv: 1 }).toArray()
    const storedMix = Object.fromEntries(['X', 'Y', 'Z'].map((xyzClass) => [xyzClass, storedPolicies.filter((row) => row.xyzClass === xyzClass).length]))
    console.log(JSON.stringify({ updated: { sop_weekly: weekly.length, inventory_policies: policies.length }, storedMix }, null, 2))
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
