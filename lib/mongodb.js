// MongoDB connection helper (single global client for hot-reload safety)
import dns from 'dns'
import { MongoClient } from 'mongodb'

// Fix Node.js DNS SRV resolution issue on Windows/local network routers
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first')
  }
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (e) {}

const uri = process.env.MONGO_URL
const dbName = process.env.DB_NAME || 'supply_chain_app'

let cachedClient = null
let cachedDb = null

export async function getDb() {
  if (cachedDb) return cachedDb

  try {
    if (dns.setDefaultResultOrder) {
      dns.setDefaultResultOrder('ipv4first')
    }
    dns.setServers(['8.8.8.8', '1.1.1.1'])
  } catch (e) {}

  if (!cachedClient) {
    cachedClient = new MongoClient(uri, { maxPoolSize: 10 })
    await cachedClient.connect()
  }
  cachedDb = cachedClient.db(dbName)
  return cachedDb
}

export async function getOrdersCollection() {
  const db = await getDb()
  return db.collection('orders')
}
