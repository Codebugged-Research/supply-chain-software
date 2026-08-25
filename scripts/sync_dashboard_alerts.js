import { getDb } from '../lib/mongodb.js'
import fs from 'fs'
import path from 'path'

async function sync() {
  try {
    const file = path.resolve(process.cwd(), 'output', 'dashboard_alerts.json')
    const alerts = JSON.parse(fs.readFileSync(file, 'utf8'))
    const db = await getDb()
    const col = db.collection('dashboard_alerts')
    await col.deleteMany({})
    if (alerts.length) {
      await col.insertMany(alerts)
    }
    console.log(`Successfully synced ${alerts.length} alerts to MongoDB dashboard_alerts collection.`)
  } catch (err) {
    console.log('MongoDB sync skipped or error:', err.message)
  }
  process.exit(0)
}

sync()
