// MongoDB connection helper (single global client for hot-reload safety)
import { MongoClient } from 'mongodb'

const uri = process.env.MONGO_URL
const dbName = process.env.DB_NAME || 'sop_demo'

let cachedClient = null
let cachedDb = null

export async function getDb() {
  if (cachedDb) return cachedDb
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
