'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import StatusBadge from '@/components/supply-chain/StatusBadge'
import {
  Grid,
  Filter,
  RefreshCw,
  Lock,
  Search,
  ExternalLink,
  ChevronRight
} from 'lucide-react'

export default function MasterSupplyWorkbenchPage() {
  const [gridData, setGridData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSku, setSelectedSku] = useState('SKU-BOAT-AD141')
  const [selectedLocation, setSelectedLocation] = useState('WH-NORTH-DELHI')
  const [selectedStartWeek, setSelectedStartWeek] = useState('2026-W32')
  const [npiProducts, setNpiProducts] = useState([])
  const [recalculating, setRecalculating] = useState(false)
  const [mrpRun, setMrpRun] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/v1/supply-planning?action=npi_readiness').then((res) => res.json()).then((json) => {
      if (json.success) setNpiProducts(json.data || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    async function fetchGrid() {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/supply-planning?action=grid&skuCode=${selectedSku}&location=${selectedLocation}&startWeek=${selectedStartWeek}`)
        const json = await res.json()
        if (json.success) {
          setGridData(json.data || [])
        }
      } catch (e) {
        console.error('Failed to load grid:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchGrid()
  }, [selectedSku, selectedLocation, selectedStartWeek])

  async function handleRecalculateMrp() {
    setRecalculating(true)
    setError('')
    try {
      const res = await fetch('/api/v1/supply-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recalculate_mrp', skuCode: selectedSku, location: selectedLocation, startWeek: selectedStartWeek }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'MRP recalculation failed')
      setGridData(json.data.rows || [])
      setMrpRun(json.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setRecalculating(false)
    }
  }

  const parsedStartWeekNum = parseInt((selectedStartWeek.match(/\d+/) || [32])[0], 10) || 32
  const firmEnd = Math.min(parsedStartWeekNum + 3, 52)
  const poEnd = Math.min(parsedStartWeekNum + 12, 52)

  return (
    <SupplyChainLayout activeTitle="Master Supply Workbench">
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm transition-colors duration-200">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Filter Product:</span>
          </div>
          <select
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="SKU-BOAT-AD141">boAt Airdopes 141 (TWS)</option>
            <option value="SKU-BOAT-LD100">boAt Lunar Discovery (Smartwatch)</option>
            <option value="SKU-BOAT-ST350">boAt Stone 350 (Speaker)</option>
            {npiProducts.map((npi) => <option key={npi.npiId} value={npi.skuId}>{npi.productName} (NPI · {npi.readinessPct}% ready)</option>)}
          </select>

          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Location:</span>
          </div>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="WH-NORTH-DELHI">WH-NORTH-DELHI (Central DC)</option>
            <option value="WH-WEST-BHIWANDI">WH-WEST-BHIWANDI (Regional DC)</option>
            <option value="WH-SOUTH-BLR">WH-SOUTH-BLR (Regional DC)</option>
            <option value="WH-EAST-KOLKATA">WH-EAST-KOLKATA (Regional DC)</option>
          </select>

          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Starting Horizon:</span>
          </div>
          <select
            value={selectedStartWeek}
            onChange={(e) => setSelectedStartWeek(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="2026-W32">2026-W32 (Current Active Week - August)</option>
            <option value="2026-W01">2026-W01 (Q1 Start - January)</option>
            <option value="2026-W14">2026-W14 (Q2 Start - April)</option>
            <option value="2026-W27">2026-W27 (Q3 Start - July)</option>
            <option value="2026-W40">2026-W40 (Q4 Start - October)</option>
            <option value="ALL">ALL (Full 52-Week Year)</option>
          </select>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <Link
            href={`/supply-planning/sku/${selectedSku}`}
            className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950 font-medium flex items-center space-x-1.5 transition-colors"
          >
            <span>SKU 360° Detail</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleRecalculateMrp}
            disabled={loading || recalculating}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
            <span>{recalculating ? 'Recalculating…' : 'Recalculate MRP'}</span>
          </button>
        </div>
      </div>

      {/* 52-Week MRP Netting Table */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Grid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Time-Phased MRP Netting Grid (52-Week Rolling Horizon)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Netting: demand − opening inventory − open PO receipts; production is capped by RM availability and remaining line capacity.
            </p>
            {mrpRun && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">Calculated {new Date(mrpRun.calculatedAt).toLocaleString()} · {mrpRun.sourceIds?.qualifiedLineIds?.length || 0} qualified line(s) · {mrpRun.sourceIds?.openPoNumbers?.length || 0} open PO(s)</p>}
            {error && <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{error}</p>}
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Weeks W{parsedStartWeekNum} to W{firmEnd} Firm Execution Locked</span>
          </div>
        </div>

        {/* Planning Horizon Explanation Bar */}
        <div className="bg-slate-50 dark:bg-slate-950/70 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Active Planning Horizon:</span>
            <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold font-mono">{selectedStartWeek === 'ALL' ? 'Full 52 Weeks' : `2026-W${parsedStartWeekNum}`}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-medium">
              <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span><strong>W{parsedStartWeekNum} to W{firmEnd}:</strong> Firm Factory Production & Dispatch (Locked)</span>
            </span>
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300 font-medium">
              <span>⚡ <strong>W{firmEnd + 1} to W{poEnd}:</strong> PO Requisitions & Work Orders Queue</span>
            </span>
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
              <span>📈 <strong>W{poEnd + 1} to W52:</strong> Long-Term Vendor Capacity Reservation</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-full" />
            <div className="h-6 bg-slate-150 dark:bg-slate-800/60 rounded w-full" />
            <div className="h-6 bg-slate-100 dark:bg-slate-800/40 rounded w-full" />
          </div>
        ) : gridData.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
            No MRP records found for selected SKU and location.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 min-w-[120px]">Week</th>
                  <th className="px-4 py-3 min-w-[120px]">Gross Demand</th>
                  <th className="px-4 py-3 min-w-[150px]">Event Adjustment</th>
                  <th className="px-4 py-3 min-w-[170px]">NPI Reservation</th>
                  <th className="px-4 py-3 min-w-[140px]">Available Stock</th>
                  <th className="px-4 py-3 min-w-[140px]">Open PO Receipts</th>
                  <th className="px-4 py-3 min-w-[130px]">Net FG Requirement</th>
                  <th className="px-4 py-3 min-w-[130px]">Capacity Headroom</th>
                  <th className="px-4 py-3 min-w-[120px]">RM Buildable</th>
                  <th className="px-4 py-3 min-w-[130px]">Net RM Shortage</th>
                  <th className="px-4 py-3 min-w-[140px]">Planned Production</th>
                  <th className="px-4 py-3 min-w-[140px]">Projected Stock</th>
                  <th className="px-4 py-3 min-w-[120px]">Supply Gap</th>
                  <th className="px-4 py-3 min-w-[120px]">Service Level</th>
                  <th className="px-4 py-3 min-w-[120px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {gridData.slice(0, selectedStartWeek === 'ALL' ? gridData.length : 16).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400">{row.week}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.forecastQty?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-fuchsia-700 dark:text-fuchsia-400">
                      {row.eventUpliftQty ? `+${row.eventUpliftQty.toLocaleString()} (${row.appliedEventIds?.join(', ')})` : '—'}
                    </td>
                    <td className="px-4 py-3 text-violet-700 dark:text-violet-400">
                      {row.npiReservationRequired ? `${row.npiReadinessPct}% ready · ${row.npiId}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{(row.openingInventoryQty ?? row.availableInventory)?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-cyan-600 dark:text-cyan-400">{(row.openPoReceiptQty ?? row.plannedPurchase)?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.netRequirementQty?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 text-blue-600 dark:text-blue-400">{row.remainingCapacityQty?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{row.rmBuildableQty?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400" title={row.componentRequirements?.filter((item) => item.shortageQty > 0).map((item) => `${item.componentSku}: ${item.shortageQty}`).join(', ')}>{row.netMaterialRequirementQty?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">{row.plannedProduction?.toLocaleString() || '-'}</td>
                    <td className={`px-4 py-3 font-semibold ${row.projectedInventory < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {row.projectedInventory?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">
                      {row.supplyGap > 0 ? row.supplyGap.toLocaleString() : '0'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.serviceLevel}%</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.planningStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SupplyChainLayout>
  )

}
