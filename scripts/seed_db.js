const fs = require('fs')
const path = require('path')
const dns = require('dns')
const { MongoClient } = require('mongodb')

// Fix Node.js DNS SRV resolution issue on Windows/local network routers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (e) {}

// Read .env manually
const envPath = path.resolve(process.cwd(), '.env')
let mongoUri = process.env.MONGO_URL
let dbName = process.env.DB_NAME || 'supply_chain_app'

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=')
      const k = trimmed.substring(0, idx).trim()
      const v = trimmed.substring(idx + 1).trim()
      if (k === 'MONGO_URL') mongoUri = v
      if (k === 'DB_NAME') dbName = v
    }
  }
}

if (!mongoUri) {
  console.error('MONGO_URL not found in .env')
  process.exit(1)
}

console.log(`Connecting to MongoDB Atlas...`)
console.log(`Database Name: ${dbName}`)

const outputDir = path.resolve(process.cwd(), 'output')
if (!fs.existsSync(outputDir)) {
  console.error(`Output directory '${outputDir}' does not exist. Run generators first.`)
  process.exit(1)
}

async function seed() {
  const client = new MongoClient(mongoUri)
  try {
    await client.connect()
    console.log('Successfully connected to MongoDB Atlas cluster!\n')
    const db = client.db(dbName)

    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.json'))
    let totalDocs = 0

    for (const file of files) {
      const collName = path.basename(file, '.json')
      const filePath = path.join(outputDir, file)
      const rawData = fs.readFileSync(filePath, 'utf-8')
      const records = JSON.parse(rawData)

      if (Array.isArray(records) && records.length > 0) {
        const coll = db.collection(collName)
        await coll.deleteMany({}) // Refresh clean
        await coll.insertMany(records)
        console.log(`  [+] Seeded collection '${collName.padEnd(28)}': ${records.length.toString().padStart(5)} documents`)
        totalDocs += records.length
      }
    }

    console.log(`\n=======================================================`)
    console.log(` SUCCESS: Seeded ${totalDocs} documents into MongoDB Atlas database '${dbName}'!`)
    console.log(`=======================================================\n`)
  } catch (err) {
    console.error('Error seeding MongoDB Atlas:', err)
  } finally {
    await client.close()
  }
}

seed()
