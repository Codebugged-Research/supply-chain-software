'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import StatusBadge from '@/components/supply-chain/StatusBadge'
import KpiCard from '@/components/supply-chain/KpiCard'
import {
  ShoppingCart,
  ArrowLeft,
  Star,
  CheckCircle2,
  Building2
} from 'lucide-react'

export default function SupplierDetailPage({ params }) {
  const supplierCode = params?.supplierCode
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSupplier() {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/supply-planning?action=supplier_detail&supplierCode=${supplierCode}`)
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        }
      } catch (e) {
        console.error('Failed to load supplier detail:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchSupplier()
  }, [supplierCode])

  const master = data?.master || {}
  const mappings = data?.mappings || []
  const pos = data?.pos || []
  const reliability = data?.reliabilityHistory || []
  const adherence = data?.poAdherenceObservations || []
  const reliability13 = reliability.find((row) => Number(row.windowWeeks) === 13)
  const adherence13 = adherence.find((row) => Number(row.windowWeeks) === 13)

  return (
    <SupplyChainLayout activeTitle={`Supplier 360° Detail: ${supplierCode}`}>
      {/* Back Button & Header */}
      <div className="flex items-center space-x-3">
        <Link
          href="/supply-planning/procurement"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{master.supplierName || supplierCode}</h2>
            <StatusBadge status={master.status || 'UNKNOWN'} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            Supplier Code: {supplierCode} | Location: {master.city || '—'}, {master.country || '—'} | Contact: {master.contactPerson || '—'}
          </p>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Quality Score"
          value={master.qualityScore == null ? '—' : `${master.qualityScore}%`}
          subtitle={reliability13 ? `13-week canonical observation · ${reliability13.eligiblePoCount} eligible POs` : 'Supplier master fallback; no reliability observation'}
          badgeText={master.qualityScore == null ? 'No Data' : master.qualityScore >= 95 ? 'High Quality' : 'Quality Watch'}
          badgeType={master.qualityScore != null && master.qualityScore >= 95 ? 'success' : 'warning'}
          loading={loading}
        />
        <KpiCard
          title="On-Time Delivery Rate (OTD)"
          value={master.onTimeDelivery == null ? '—' : `${master.onTimeDelivery}%`}
          subtitle={adherence13 ? `13-week PO adherence · ${adherence13.eligiblePoCount} eligible POs` : 'Supplier master fallback; no adherence observation'}
          badgeText={master.onTimeDelivery == null ? 'No Data' : master.onTimeDelivery >= 95 ? 'On Target' : 'Below Target'}
          badgeType={master.onTimeDelivery != null && master.onTimeDelivery >= 95 ? 'success' : 'warning'}
          loading={loading}
        />
        <KpiCard
          title="Standard Lead Time"
          value={master.defaultLeadTimeDays == null ? '—' : `${master.defaultLeadTimeDays} Days`}
          subtitle="Contractual lead time allowance"
          badgeText="Standard Lead Time"
          badgeType="info"
          loading={loading}
        />
      </div>

      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Canonical Supplier Performance History</h3>
          <p className="text-xs text-slate-500 mt-1">Direct 4/13/52-week observations from supplier_reliability_history and po_adherence_observations.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase"><tr><th className="px-4 py-3">Window</th><th className="px-4 py-3">PO Adherence</th><th className="px-4 py-3">Reliability</th><th className="px-4 py-3">Lead Time</th><th className="px-4 py-3">Quality</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{[4, 13, 52].map((window) => { const rel = reliability.find((row) => Number(row.windowWeeks) === window); const obs = adherence.find((row) => Number(row.windowWeeks) === window); return <tr key={window}><td className="px-4 py-3 font-semibold">{window} weeks</td><td className="px-4 py-3">{obs?.onTimeDeliveryRate == null ? '—' : `${(obs.onTimeDeliveryRate * 100).toFixed(1)}%`} ({obs?.onTimePoCount ?? '—'}/{obs?.eligiblePoCount ?? '—'})</td><td className="px-4 py-3">{rel?.reliabilityScore ?? '—'} · {rel?.reliabilityGrade ?? '—'}</td><td className="px-4 py-3">{rel?.quotedLeadTimeDays ?? '—'}d quoted / {rel?.actualAverageLeadTimeDays ?? '—'}d actual</td><td className="px-4 py-3">{rel?.qualityAcceptanceRate == null ? '—' : `${(rel.qualityAcceptanceRate * 100).toFixed(1)}%`}</td></tr> })}</tbody>
          </table>
        </div>
      </div>

      {/* Corporate Profile & Active POs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm transition-colors duration-200">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Corporate Operational Profile</span>
          </h3>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            {master.profile || 'No supplier profile is stored for this partner.'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm transition-colors duration-200">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <ShoppingCart className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Active Purchase Orders</span>
          </h3>
          {pos.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No open purchase orders currently assigned to this vendor.</p>
          ) : (
            <div className="space-y-2">
              {pos.slice(0, 4).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                  <div>
                    <span className="font-semibold text-cyan-600 dark:text-cyan-400">{p.poNumber}</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.skuCode}</p>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{p.orderedQty?.toLocaleString()} Units</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SupplyChainLayout>
  )
}
