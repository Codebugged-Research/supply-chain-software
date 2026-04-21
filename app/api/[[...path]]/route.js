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

// -----------------------------------------------------------------------
// Order Freeze Logic
// -----------------------------------------------------------------------
//   • day < 25  → "editable"   (fully editable)
//   • 25 ≤ day ≤ 28 → "restricted" (max ±10% per-line qty change)
//   • day ≥ 29  → "locked"     (no edits — approval workflow required)
// -----------------------------------------------------------------------
function computeLockState(simDay) {
  const raw = simDay !== undefined && simDay !== null && simDay !== ''
    ? Math.max(1, Math.min(31, Math.floor(Number(simDay))))
    : new Date().getUTCDate()
  if (raw < 25) return { state: 'editable', label: 'Editable', day: raw, maxDeltaPct: null,
    hint: `Day ${raw} of month · fully editable until the 25th` }
  if (raw <= 28) return { state: 'restricted', label: 'Restricted', day: raw, maxDeltaPct: 10,
    hint: `Day ${raw} of month · edits limited to ±10% per line until the 28th` }
  return { state: 'locked', label: 'Locked', day: raw, maxDeltaPct: 0,
    hint: `Day ${raw} of month · order book frozen · approval required to amend` }
}

// Rebuild enriched lines (with scheme pricing) from raw {skuId, qty} inputs.
// Used by both POST /orders/place and PATCH /orders/update so behaviour is identical.
function enrichLines(distributorId, inputLines) {
  const suggestion = suggestOrders(distributorId)
  const lineMap = Object.fromEntries(suggestion.lines.map((l) => [l.skuId, l]))
  const enriched = []
  let totalQty = 0
  let totalValue = 0
  for (const ln of inputLines || []) {
    const ref = lineMap[ln.skuId]
    if (!ref) continue
    const qn = Math.max(0, Math.round(Number(ln.qty) || 0))
    if (qn <= 0) continue
    const discount = ref.scheme?.discountPct || 0
    const effectivePrice = Math.round(ref.price * (1 - discount / 100) * 100) / 100
    const lineValue = Math.round(qn * effectivePrice * 100) / 100
    totalQty += qn
    totalValue += lineValue
    enriched.push({
      skuId: ln.skuId,
      skuName: ref.skuName,
      category: ref.category,
      qty: qn,
      unitPrice: ref.price,
      effectivePrice,
      lineValue,
      scheme: ref.scheme?.label || null,
      discountPct: discount,
    })
  }
  totalValue = Math.round(totalValue * 100) / 100
  const cashflow = totalValue >= 75000 ? 'high' : totalValue >= 25000 ? 'medium' : 'low'
  return { lines: enriched, totalQty, totalValue, cashflow }
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

  // GET /api/orders/rules?simDay=N   — expose current lock state + rule schema
  if (path === 'orders/rules') {
    const { simDay } = q(request)
    return NextResponse.json({
      lockState: computeLockState(simDay),
      rules: [
        { window: 'Day 1–24',  state: 'editable',   label: 'Fully editable',            maxDeltaPct: null },
        { window: 'Day 25–28', state: 'restricted', label: 'Max ±10% per-line change',  maxDeltaPct: 10 },
        { window: 'Day 29+',   state: 'locked',     label: 'Locked · approval required', maxDeltaPct: 0 },
      ],
    })
  }

  // GET /api/orders  OR  GET /api/orders?distributorId=DST-001&simDay=26
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
      const lockState = computeLockState(query.simDay)
      return NextResponse.json({
        count: orders.length,
        lockState,
        orders: orders.map((o) => ({ ...o, lockState })),
      })
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
      const { distributorId, lines = [], notes, simDay } = body
      if (!distributorId || !Array.isArray(lines) || lines.length === 0) {
        return NextResponse.json({ error: 'distributorId and non-empty lines are required' }, { status: 400 })
      }

      const distributor = DISTRIBUTORS.find((d) => d.id === distributorId)
      if (!distributor) {
        return NextResponse.json({ error: `Unknown distributor ${distributorId}` }, { status: 404 })
      }

      // Recompute suggestions so we can enrich the saved lines with price/scheme
      const suggestion = suggestOrders(distributorId)
      const built = enrichLines(distributorId, lines)

      if (!built.lines.length) {
        return NextResponse.json({ error: 'All order lines were empty/invalid' }, { status: 400 })
      }

      const orderDoc = {
        orderId: 'ORD-' + uuidv4().slice(0, 8).toUpperCase(),
        distributorId,
        distributorName: distributor.name,
        region: distributor.region,
        status: 'Pending',
        totalQty: built.totalQty,
        totalValue: built.totalValue,
        cashflow: built.cashflow,
        leadTimeDays: suggestion.leadTimeDays,
        tentativeDeliveryDate: suggestion.tentativeDeliveryDate,
        notes: notes || null,
        lines: built.lines,
        pendingApproval: null,
        createdAt: new Date().toISOString(),
        lastUpdatedAt: null,
      }

      const col = await getOrdersCollection()
      await col.insertOne(orderDoc)

      // Strip Mongo _id from response & decorate with current lockState
      const { _id, ...clean } = orderDoc
      return NextResponse.json(
        { ok: true, order: { ...clean, lockState: computeLockState(simDay) } },
        { status: 201 }
      )
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  const body = await request.json().catch(() => ({}))
  return NextResponse.json({ message: `POST /api/${path}`, received: body })
}

// =======================================================================
// PATCH /api/orders/update
// -----------------------------------------------------------------------
// Body: { orderId, lines:[{skuId,qty}], action?, note?, simDay? }
//   action ∈ { "edit" (default), "request_approval", "approve", "reject" }
//
// Rules enforced against the current lockState (today or simDay override):
//   • editable   → any edit allowed (status → 'Amended')
//   • restricted → per-line qty change must be ≤ ±10% (else 400)
//   • locked     → action=edit returns 403;
//                  action=request_approval stores pendingApproval & sets
//                    status='Pending Approval' (HTTP 202)
//   • action=approve → applies pendingApproval, status='Approved'
//   • action=reject  → discards pendingApproval, status='Rejected'
// =======================================================================
export async function PATCH(request, { params }) {
  const path = (params?.path || []).join('/')

  if (path === 'orders/update') {
    try {
      const body = await request.json()
      const { orderId, lines = [], action = 'edit', note = null, simDay = null } = body
      if (!orderId) {
        return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
      }

      const col = await getOrdersCollection()
      const existing = await col.findOne({ orderId }, { projection: { _id: 0 } })
      if (!existing) {
        return NextResponse.json({ error: `Order ${orderId} not found` }, { status: 404 })
      }

      const lockState = computeLockState(simDay)
      const origBySku = Object.fromEntries((existing.lines || []).map((l) => [l.skuId, l]))

      // Max |Δ%| per-line between existing and the proposed lines.
      // Adding an all-new SKU (original qty = 0) counts as Infinity (>100%).
      const maxDeltaPct = (newLines) => {
        let max = 0
        const skus = new Set([
          ...Object.keys(origBySku),
          ...newLines.map((l) => l.skuId),
        ])
        for (const skuId of skus) {
          const o = origBySku[skuId]?.qty || 0
          const n = Math.max(0, Math.round(Number((newLines.find((l) => l.skuId === skuId) || {}).qty) || 0))
          if (o === 0 && n === 0) continue
          if (o === 0) return Infinity
          const pct = Math.abs((n - o) / o) * 100
          if (pct > max) max = pct
        }
        return max
      }

      // ---- APPROVE: commit the pending change ----------------------------
      if (action === 'approve') {
        const p = existing.pendingApproval
        if (!p || p.status !== 'pending') {
          return NextResponse.json({ error: 'No pending approval to approve' }, { status: 400 })
        }
        await col.updateOne({ orderId }, {
          $set: {
            lines: p.requestedLines,
            totalQty: p.requestedTotalQty,
            totalValue: p.requestedTotalValue,
            cashflow: p.requestedCashflow,
            status: 'Approved',
            pendingApproval: {
              ...p,
              status: 'approved',
              decidedAt: new Date().toISOString(),
              decidedBy: 'Demo Approver',
              approvalNote: note || null,
            },
            lastUpdatedAt: new Date().toISOString(),
          },
        })
        const u = await col.findOne({ orderId }, { projection: { _id: 0 } })
        return NextResponse.json({ ok: true, action: 'approved', order: { ...u, lockState } })
      }

      // ---- REJECT: discard the pending change ----------------------------
      if (action === 'reject') {
        const p = existing.pendingApproval
        if (!p || p.status !== 'pending') {
          return NextResponse.json({ error: 'No pending approval to reject' }, { status: 400 })
        }
        await col.updateOne({ orderId }, {
          $set: {
            status: 'Rejected',
            pendingApproval: {
              ...p,
              status: 'rejected',
              decidedAt: new Date().toISOString(),
              decidedBy: 'Demo Approver',
              rejectionNote: note || null,
            },
            lastUpdatedAt: new Date().toISOString(),
          },
        })
        const u = await col.findOne({ orderId }, { projection: { _id: 0 } })
        return NextResponse.json({ ok: true, action: 'rejected', order: { ...u, lockState } })
      }

      // ---- REQUEST APPROVAL: allowed only when locked --------------------
      if (action === 'request_approval') {
        if (lockState.state !== 'locked') {
          return NextResponse.json({
            error: `Approval is only needed when the order is locked. Current state: ${lockState.state}.`,
            lockState,
          }, { status: 400 })
        }
        const built = enrichLines(existing.distributorId, lines)
        if (!built.lines.length) {
          return NextResponse.json({ error: 'At least one non-zero line is required for approval request' }, { status: 400 })
        }
        const pending = {
          requestedAt: new Date().toISOString(),
          requestedBy: 'Demo Planner',
          requestedLines: built.lines,
          requestedTotalQty: built.totalQty,
          requestedTotalValue: built.totalValue,
          requestedCashflow: built.cashflow,
          note: note || null,
          status: 'pending',
          reason: `Order locked (day ${lockState.day} ≥ 29). Awaiting governance approval.`,
        }
        await col.updateOne({ orderId }, {
          $set: {
            status: 'Pending Approval',
            pendingApproval: pending,
            lastUpdatedAt: new Date().toISOString(),
          },
        })
        const u = await col.findOne({ orderId }, { projection: { _id: 0 } })
        return NextResponse.json({ ok: true, action: 'approval_requested', order: { ...u, lockState } }, { status: 202 })
      }

      // ---- DEFAULT: EDIT (subject to window rules) -----------------------
      if (lockState.state === 'locked') {
        return NextResponse.json({
          error: `Order is locked (day ${lockState.day} ≥ 29). Submit action="request_approval" to route for approval.`,
          lockState,
        }, { status: 403 })
      }

      if (lockState.state === 'restricted') {
        const mdp = maxDeltaPct(lines)
        if (mdp > 10) {
          return NextResponse.json({
            error: `Restricted window (day 25–28). Per-line qty changes are capped at ±10%. Your change was ${mdp === Infinity ? '>100' : mdp.toFixed(1)}%.`,
            maxDeltaPct: mdp === Infinity ? 999 : Math.round(mdp * 100) / 100,
            lockState,
          }, { status: 400 })
        }
      }

      const built = enrichLines(existing.distributorId, lines)
      if (!built.lines.length) {
        return NextResponse.json({ error: 'At least one non-zero line is required' }, { status: 400 })
      }

      await col.updateOne({ orderId }, {
        $set: {
          lines: built.lines,
          totalQty: built.totalQty,
          totalValue: built.totalValue,
          cashflow: built.cashflow,
          status: 'Amended',
          lastUpdatedAt: new Date().toISOString(),
        },
      })
      const u = await col.findOne({ orderId }, { projection: { _id: 0 } })
      return NextResponse.json({ ok: true, action: 'edited', order: { ...u, lockState } })
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  return NextResponse.json({ message: `PATCH /api/${path}` }, { status: 404 })
}
