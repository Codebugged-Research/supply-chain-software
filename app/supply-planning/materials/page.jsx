'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import StatusBadge from '@/components/supply-chain/StatusBadge'
import KpiCard from '@/components/supply-chain/KpiCard'
import {
  Boxes,
  Layers,
  AlertCircle,
  ExternalLink,
  ShoppingCart
} from 'lucide-react'

export default function MaterialExplosionPage() {
  const [bomData, setBomData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedParentSku, setSelectedParentSku] = useState('SKU-BOAT-AD141')

  useEffect(() => {
    async function fetchBom() {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/supply-planning?action=bom&parentSku=${selectedParentSku}`)
        const json = await res.json()
        if (json.success) {
          setBomData(json.data || [])
        }
      } catch (e) {
        console.error('Failed to load BOM:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchBom()
  }, [selectedParentSku])

  return (
    <SupplyChainLayout activeTitle="Material & Assembly Explosion (BOM)">
      {/* Top Selector & Controls */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm transition-colors duration-200">
        <div className="flex items-center space-x-3 text-xs">
          <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Select Parent Assembly:</span>
          <select
            value={selectedParentSku}
            onChange={(e) => setSelectedParentSku(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="SKU-BOAT-AD141">boAt Airdopes 141 (TWS Earbuds)</option>
            <option value="SKU-BOAT-LD100">boAt Lunar Discovery (Smartwatch)</option>
            <option value="SKU-BOAT-ST350">boAt Stone 350 (Portable Speaker)</option>
          </select>
        </div>

        <Link
          href="/supply-planning/procurement"
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Issue Component Purchase Orders</span>
        </Link>
      </div>

      {/* BOM Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Component Sub-Assemblies"
          value={bomData.length.toString()}
          subtitle="Direct BOM items"
          loading={loading}
          badgeText="Active BOM"
          badgeType="info"
        />
        <KpiCard
          title="Gating Shortage Items"
          value={bomData.filter(b => b.isGating).length.toString()}
          subtitle="Components blocking assembly schedule"
          loading={loading}
          badgeText={bomData.some(b => b.isGating) ? "Gating Risk" : "Feasible"}
          badgeType={bomData.some(b => b.isGating) ? "danger" : "success"}
        />
        <KpiCard
          title="Average Scrap Loss Allowance"
          value="1.5%"
          subtitle="Yield variance factor applied"
          loading={loading}
          badgeText="Standard Scrap"
          badgeType="info"
        />
      </div>

      {/* BOM Netting Table */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Multi-Level Component Netting & Feasibility Matrix</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Parent Assembly SKU: <strong className="text-slate-800 dark:text-slate-200">{selectedParentSku}</strong>
          </p>
        </div>

        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-full" />
            <div className="h-6 bg-slate-150 dark:bg-slate-800/60 rounded w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Component SKU</th>
                  <th className="px-4 py-3">Component Name</th>
                  <th className="px-4 py-3">Qty / Assembly</th>
                  <th className="px-4 py-3">UOM</th>
                  <th className="px-4 py-3">Scrap %</th>
                  <th className="px-4 py-3">On-Hand Stock</th>
                  <th className="px-4 py-3">Gating Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {bomData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400">{row.componentSku}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.componentName}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.quantity}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.unitOfMeasure}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.scrapPercent}%</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{row.onHandQty?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {row.isGating ? (
                        <StatusBadge status="SHORTAGE" />
                      ) : (
                        <StatusBadge status="FEASIBLE" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/supply-planning/sku/${row.componentSku}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px]"
                      >
                        Inspect SKU
                      </Link>
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
