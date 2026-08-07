'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import StatusBadge from '@/components/supply-chain/StatusBadge'
import KpiCard from '@/components/supply-chain/KpiCard'
import {
  Boxes,
  ArrowLeft,
  DollarSign,
  Package,
  Layers,
  CheckCircle2
} from 'lucide-react'

export default function SkuDetailPage({ params }) {
  const skuCode = params?.skuCode || 'SKU-BOAT-AD141'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSku() {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/supply-planning?action=sku_detail&skuCode=${skuCode}`)
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        }
      } catch (e) {
        console.error('Failed to load SKU detail:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchSku()
  }, [skuCode])

  const master = data?.master || {}
  const planning = data?.planning || {}
  const pricing = data?.pricing || {}
  const logistics = data?.logistics || {}
  const bom = data?.bom || []

  return (
    <SupplyChainLayout activeTitle={`SKU 360° Detail: ${skuCode}`}>
      {/* Back Button & Header */}
      <div className="flex items-center space-x-3">
        <Link
          href="/supply-planning/workspace"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{master.skuName || skuCode}</h2>
            <StatusBadge status={master.status || 'ACTIVE'} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            SKU Code: {skuCode} | Brand: {master.brand} | Category: {master.category} ({master.subCategory})
          </p>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Average Selling Price (ASP)"
          value={`₹${pricing.averageSellingPrice || '1,299'}`}
          subtitle={`MRP: ₹${pricing.mrp || '4,490'}`}
          loading={loading}
        />
        <KpiCard
          title="Target Gross Margin (%)"
          value={`${pricing.targetMarginPercent || 63}%`}
          subtitle={`Standard Cost: ₹${pricing.standardCost || 420}`}
          badgeText="High Margin"
          badgeType="success"
          loading={loading}
        />
        <KpiCard
          title="ABC / XYZ Classification"
          value={`Class ${planning.abcClass || 'A'} / ${planning.xyzClass || 'X'}`}
          subtitle="Pareto Top Revenue Contributor"
          badgeText="Priority 1"
          badgeType="info"
          loading={loading}
        />
        <KpiCard
          title="Safety Stock Days"
          value={`${planning.safetyStockDays || 15} Days`}
          subtitle={`MOQ: ${planning.minimumOrderQuantity || 2500} Units`}
          badgeText="Safety Buffer"
          badgeType="info"
          loading={loading}
        />
      </div>

      {/* Deep-Dive Specifications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Planning & Logistics Specs */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm transition-colors duration-200">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Planning & Logistics Parameters</span>
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans block">Planning Strategy:</span>
              <strong className="text-slate-800 dark:text-slate-200">{planning.planningStrategy || 'MTS'}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans block">Target Service Level:</span>
              <strong className="text-emerald-600 dark:text-emerald-400">{planning.targetServiceLevel || 98.5}%</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans block">Planning Fence Days:</span>
              <strong className="text-slate-800 dark:text-slate-200">{planning.planningFenceDays || 14} Days</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans block">Demand Time Fence:</span>
              <strong className="text-slate-800 dark:text-slate-200">{planning.demandTimeFenceDays || 7} Days</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans block">Gross / Net Weight:</span>
              <strong className="text-slate-800 dark:text-slate-200">{logistics.grossWeightKg || 0.18} kg / {logistics.netWeightKg || 0.06} kg</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans block">Carton / Pallet Lot:</span>
              <strong className="text-slate-800 dark:text-slate-200">{logistics.cartonQuantity || 40} / {logistics.palletQuantity || 1920} Units</strong>
            </div>
          </div>
        </div>

        {/* Multi-Level Assembly BOM */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm transition-colors duration-200">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Assembly Bill of Materials (BOM)</span>
          </h3>
          {bom.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">Raw component material (No child BOM items).</p>
          ) : (
            <div className="space-y-2">
              {bom.map((b, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">{b.componentSku}</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Scrap Allowance: {b.scrapPercent}%</p>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{b.quantity} {b.unitOfMeasure}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SupplyChainLayout>
  )
}

