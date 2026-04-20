import { NextResponse } from 'next/server'
import {
  getDataset,
  filterWeekly,
  aggregate,
  kpis,
  REGIONS,
  DISTRIBUTORS,
  SKUS,
} from '@/lib/dummyData'

// Helper: parse query params
function q(request) {
  const url = new URL(request.url)
  return Object.fromEntries(url.searchParams.entries())
}

export async function GET(request, { params }) {
  const path = (params?.path || []).join('/')

  // ---- Health / root ---------------------------------------------------
  if (path === '' || path === 'health') {
    return NextResponse.json({ status: 'ok', service: 'S&OP Demo API' })
  }

  // ---- Dataset endpoints ----------------------------------------------
  if (path === 'data/meta') {
    return NextResponse.json(getDataset().meta)
  }
  if (path === 'data/skus') {
    return NextResponse.json(SKUS)
  }
  if (path === 'data/distributors') {
    return NextResponse.json(DISTRIBUTORS)
  }
  if (path === 'data/regions') {
    return NextResponse.json(REGIONS)
  }
  if (path === 'data/weeks') {
    return NextResponse.json(getDataset().weeks)
  }
  if (path === 'data/kpis') {
    return NextResponse.json(kpis())
  }
  if (path === 'data/weekly') {
    // Filters: sku, distributor, region, category, weekFrom, weekTo
    const rows = filterWeekly(q(request))
    return NextResponse.json({ count: rows.length, rows })
  }
  if (path === 'data/aggregate') {
    // ?by=weekId|skuId|distributorId|region|category & filters...
    const { by = 'weekId', ...filters } = q(request)
    const rows = filterWeekly(filters)
    const agg = aggregate(rows, by)
    // sort naturally
    agg.sort((a, b) => (a.key > b.key ? 1 : -1))
    return NextResponse.json({ groupBy: by, count: agg.length, rows: agg })
  }

  return NextResponse.json({ message: `GET /api/${path}` })
}

export async function POST(request, { params }) {
  const path = (params?.path || []).join('/')
  const body = await request.json().catch(() => ({}))
  return NextResponse.json({ message: `POST /api/${path}`, received: body })
}
