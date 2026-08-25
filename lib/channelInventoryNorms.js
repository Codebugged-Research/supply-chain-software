import fs from 'fs'
import path from 'path'
import { getDb, handleMongoError } from './mongodb.js'

export const CHANNEL_INVENTORY_NORMS_COLLECTION = 'channel_inventory_norms'

let cachedNorms = null
let cachedNormsAt = 0
const NORMS_CACHE_TTL_MS = 15000

function readFallback() {
  try {
    const file = path.resolve(process.cwd(), 'output', `${CHANNEL_INVENTORY_NORMS_COLLECTION}.json`)
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []
  } catch (error) {
    console.warn(`Channel inventory norm fallback failed: ${error.message}`)
    return []
  }
}

export function effectiveChannelInventoryNorm(row) {
  const suggestedDos = Number(row.targetDos ?? row.suggestedDos ?? 0)
  const effectiveDos = Number(row.overrideDos ?? suggestedDos)
  const minDos = row.overrideDos == null ? Number(row.minDos ?? Math.max(0, suggestedDos - 5)) : Math.max(0, effectiveDos - 5)
  const maxDos = row.overrideDos == null ? Number(row.maxDos ?? suggestedDos + 8) : effectiveDos + 7
  const actualDos = Number(row.actualDos ?? 0)
  const varianceDays = actualDos - effectiveDos
  const normStatus = actualDos < minDos ? 'CRITICAL' : actualDos > maxDos ? 'OVERSTOCK' : Math.abs(varianceDays) <= 3 ? 'HEALTHY' : 'WATCH'
  return { ...row, suggestedDos, targetDos: suggestedDos, effectiveDos, minDos, maxDos, actualDos, varianceDays, normStatus, canonicalCollection: CHANNEL_INVENTORY_NORMS_COLLECTION }
}

export function selectEffectiveChannelInventoryNorms(rows) {
  const selected = new Map()
  rows.filter((row) => row.status !== 'INACTIVE').forEach((row) => {
    const key = `${row.skuId}|${row.distributorId}`
    const current = selected.get(key)
    const newer = !current || Number(row.version || 0) > Number(current.version || 0) ||
      (Number(row.version || 0) === Number(current.version || 0) && String(row.effectiveFromWeek || '') > String(current.effectiveFromWeek || ''))
    if (newer) selected.set(key, row)
  })
  return Array.from(selected.values()).map(effectiveChannelInventoryNorm)
}

export async function getCanonicalChannelInventoryNorms() {
  if (cachedNorms && Date.now() - cachedNormsAt < NORMS_CACHE_TTL_MS) {
    return cachedNorms
  }
  let rows = []
  try {
    const db = await getDb()
    rows = await db.collection(CHANNEL_INVENTORY_NORMS_COLLECTION).find({}).project({ _id: 0 }).toArray()
  } catch (error) {
    handleMongoError(error)
  }
  const result = selectEffectiveChannelInventoryNorms(rows.length ? rows : readFallback())
  cachedNorms = result
  cachedNormsAt = Date.now()
  return result
}

export async function saveCanonicalChannelInventoryNorm(row) {
  cachedNorms = null
  cachedNormsAt = 0
  const db = await getDb()
  const persisted = { ...row }
  for (const field of ['_id', 'effectiveDos', 'varianceDays', 'normStatus', 'canonicalCollection']) delete persisted[field]
  await db.collection(CHANNEL_INVENTORY_NORMS_COLLECTION).replaceOne({
    skuId: persisted.skuId,
    distributorId: persisted.distributorId,
    effectiveFromWeek: persisted.effectiveFromWeek,
    version: persisted.version,
  }, persisted, { upsert: true })
  return effectiveChannelInventoryNorm(persisted)
}

