// MongoDB connection helper (single global client with fast circuit breaker)
import dns from 'dns'
import { MongoClient } from 'mongodb'

try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first')
  }
} catch (e) {}

const uri = process.env.MONGO_URL
const dbName = process.env.DB_NAME || 'supply_chain_app'

let mongoDisabledUntil = 0
let lastErrorLogAt = 0

function createClientPromise() {
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 1500,
    connectTimeoutMS: 1500,
    socketTimeoutMS: 3000,
  })
  return client.connect()
}

let clientPromise

export function handleMongoError(err) {
  const now = Date.now()
  if (process.env.DEBUG_STORAGE) {
    if (now - lastErrorLogAt > 60000) {
      console.warn(`[Storage] MongoDB unavailable (${err?.message || 'timeout'}). Seamlessly using local JSON persistence.`)
      lastErrorLogAt = now
    }
  }
  mongoDisabledUntil = now + 60000 // Disable Mongo queries for 60 seconds on error
  if (process.env.NODE_ENV === 'development') {
    global._mongoClientPromise = null
  }
}

export async function getDb() {
  if (Date.now() < mongoDisabledUntil) {
    throw new Error('MongoDB circuit breaker active')
  }
  try {
    if (process.env.NODE_ENV === 'development') {
      if (!global._mongoClientPromise) {
        global._mongoClientPromise = createClientPromise()
      }
      clientPromise = global._mongoClientPromise
    } else {
      if (!clientPromise) {
        clientPromise = createClientPromise()
      }
    }
    const client = await clientPromise
    return client.db(dbName)
  } catch (err) {
    handleMongoError(err)
    throw err
  }
}

export async function getOrdersCollection() {
  const db = await getDb()
  return db.collection('orders')
}



