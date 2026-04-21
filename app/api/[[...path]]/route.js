import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import {
  getDataset,
  filterWeekly,
  aggregate,
  kpis,
  suggestOrders,
  REGIONS,
  DISTRIBUTORS,
  SKUS,
} from '@/lib/dummyData'
import { getOrdersCollection } from '@/lib/mongodb'

function q(request) {
  const url = new URL(request.url)
  return Object.fromEntries(url.searchParams.entries())
}

export async function GET(request, { params }) {
  const path = (params?.path || []).join('/')

  // ---- Health ----------------------------------------------------------
  if (path === '' || path === 'health') {
    return NextResponse.json({ status: 'ok', service: 'S&OP Demo API' })
  }

  // ---- Dataset endpoints ----------------------------------------------
  if (path === 'data/meta') return NextResponse.json(getDataset().meta)
  if (path === 'data/skus') return NextResponse.json(SKUS)
  if (path === 'data/distributors') return NextResponse.json(DISTRIBUTORS)
  if (path === 'data/regions') return NextResponse.json(REGIONS)
  if (path === 'data/weeks') return NextResponse.json(getDataset().weeks)
  if (path === 'data/kpis') return NextResponse.json(kpis())

  if (path === 'data/weekly') {
    const rows = filterWeekly(q(request))
    return NextResponse.json({ count: rows.length, rows })
  }

  if (path === 'data/aggregate') {
    const { by = 'weekId', ...filters } = q(request)
    const rows = filterWeekly(filters)
    const agg = aggregate(rows, by)
    agg.sort((a, b) => (a.key > b.key ? 1 : -1))
    return NextResponse.json({ groupBy: by, count: agg.length, rows: agg })
  }

  // ---- Order endpoints -------------------------------------------------
  // GET /api/orders/suggest?distributorId=DST-001
  if (path === 'orders/suggest') {
    const { distributorId } = q(request)
    if (!distributorId) {
      return NextResponse.json({ error: 'distributorId required' }, { status: 400 })
    }
    const suggestion = suggestOrders(distributorId)
    if (!suggestion.distributor) {
      return NextResponse.json({ error: `Unknown distributor ${distributorId}` }, { status: 404 })
    }
    return NextResponse.json(suggestion)
  }

  // GET /api/orders  OR  GET /api/orders?distributorId=DST-001
  if (path === 'orders') {
    try {
      const col = await getOrdersCollection()
      const filter = {}
      const query = q(request)
      if (query.distributorId) filter.distributorId = query.distributorId
      const orders = await col
        .find(filter, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()
      return NextResponse.json({ count: orders.length, orders })
    } catch (e) {
      return NextResponse.json({ error: e.message, count: 0, orders: [] }, { status: 500 })
    }
  }

  return NextResponse.json({ message: `GET /api/${path}` })
}

export async function POST(request, { params }) {
  const path = (params?.path || []).join('/')

  // POST /api/orders/place
  if (path === 'orders/place') {
    try {
      const body = await request.json()
      const { distributorId, lines = [], notes } = body
      if (!distributorId || !Array.isArray(lines) || lines.length === 0) {
        return NextResponse.json({ error: 'distributorId and non-empty lines are required' }, { status: 400 })
      }

      const distributor = DISTRIBUTORS.find((d) => d.id === distributorId)
      if (!distributor) {
        return NextResponse.json({ error: `Unknown distributor ${distributorId}` }, { status: 404 })
      }

      // Recompute suggestions so we can enrich the saved lines with price/scheme
      const suggestion = suggestOrders(distributorId)
      const lineMap = Object.fromEntries(suggestion.lines.map((l) => [l.skuId, l]))

      const enrichedLines = []
      let totalQty = 0
      let totalValue = 0
      for (const ln of lines) {
        const { skuId, qty } = ln
        const ref = lineMap[skuId]
        if (!ref) continue
        const q2 = Math.max(0, Math.round(Number(qty) || 0))
        if (q2 <= 0) continue
        const discount = ref.scheme?.discountPct || 0
        const effectivePrice = Math.round(ref.price * (1 - discount / 100) * 100) / 100
        const lineValue = Math.round(q2 * effectivePrice * 100) / 100
        totalQty += q2
        totalValue += lineValue
        enrichedLines.push({
          skuId,
          skuName: ref.skuName,
          category: ref.category,
          qty: q2,
          unitPrice: ref.price,
          effectivePrice,
          lineValue,
          scheme: ref.scheme?.label || null,
          discountPct: discount,
        })
      }

      if (!enrichedLines.length) {
        return NextResponse.json({ error: 'All order lines were empty/invalid' }, { status: 400 })
      }

      // Cashflow indicator (matches front-end thresholds)
      let cashflow = 'low'
      if (totalValue >= 75000) cashflow = 'high'
      else if (totalValue >= 25000) cashflow = 'medium'

      const orderDoc = {
        orderId: 'ORD-' + uuidv4().slice(0, 8).toUpperCase(),
        distributorId,
        distributorName: distributor.name,
        region: distributor.region,
        status: 'Pending',
        totalQty,
        totalValue: Math.round(totalValue * 100) / 100,
        cashflow,
        leadTimeDays: suggestion.leadTimeDays,
        tentativeDeliveryDate: suggestion.tentativeDeliveryDate,
        notes: notes || null,
        lines: enrichedLines,
        createdAt: new Date().toISOString(),
      }

      const col = await getOrdersCollection()
      await col.insertOne(orderDoc)

      // Strip Mongo _id from response
      const { _id, ...clean } = orderDoc
      return NextResponse.json({ ok: true, order: clean }, { status: 201 })
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  const body = await request.json().catch(() => ({}))
  return NextResponse.json({ message: `POST /api/${path}`, received: body })
}
