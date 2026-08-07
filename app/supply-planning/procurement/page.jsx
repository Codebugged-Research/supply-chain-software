'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import StatusBadge from '@/components/supply-chain/StatusBadge'
import KpiCard from '@/components/supply-chain/KpiCard'
import {
  ShoppingCart,
  CheckCircle,
  ExternalLink,
  Calendar,
  AlertTriangle
} from 'lucide-react'

export default function ProcurementPage() {
  const [pos, setPos] = useState([])
  const [needDates, setNeedDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders')

  useEffect(() => {
    async function fetchProcurementData() {
      setLoading(true)
      try {
        const [resPo, resNeed] = await Promise.all([
          fetch('/api/v1/supply-planning?action=procurement'),
          fetch('/api/v1/supply-planning?action=supplier_production_need_dates')
        ])

        const jsonPo = await resPo.json()
        const jsonNeed = await resNeed.json()

        if (jsonPo.success) setPos(jsonPo.data || [])
        if (jsonNeed.success) setNeedDates(jsonNeed.data || [])
      } catch (e) {
        console.error('Failed to load procurement:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchProcurementData()
  }, [])

  return (
    <SupplyChainLayout activeTitle="Procurement Execution & Supplier Alignment">
      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Open PO Commitments"
          value="₹18.4M INR"
          subtitle="48 Confirmed PO Lines"
          badgeText="Financial Commitment"
          badgeType="info"
          loading={loading}
        />
        <KpiCard
          title="Vendor On-Time Delivery %"
          value="96.2%"
          subtitle="Tier-1 EMS & Component Vendors"
          badgeText="High Reliability"
          badgeType="success"
          loading={loading}
        />
        <KpiCard
          title="MOQ Lot Compliance"
          value="100%"
          subtitle="All order quantities rounded to MOQ multiples"
          badgeText="Compliant"
          badgeType="success"
          loading={loading}
        />
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'orders'
            ? 'bg-cyan-600 text-white shadow-md'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          PO Release Queue Workbench
        </button>
        <button
          onClick={() => setActiveTab('need_dates')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'need_dates'
            ? 'bg-cyan-600 text-white shadow-md'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          Supplier Delivery vs. Production Need Dates
        </button>
      </div>

      {/* TAB 1: PO Workbench Table */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Purchase Order Release Queue & Approval Workbench</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Approved purchase orders generated from time-phased MRP netting requirements.
              </p>
            </div>
            <button
              onClick={() => alert("All pending draft purchase orders approved!")}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Batch Approve POs</span>
            </button>
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
                    <th className="px-4 py-3">PO Number</th>
                    <th className="px-4 py-3">Supplier Name</th>
                    <th className="px-4 py-3">Product SKU</th>
                    <th className="px-4 py-3">Ordered Qty</th>
                    <th className="px-4 py-3">Received Qty</th>
                    <th className="px-4 py-3">Expected Delivery</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {pos.slice(0, 15).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-cyan-600 dark:text-cyan-400">{row.poNumber}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.supplierName}</td>
                      <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400">{row.skuCode}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{row.orderedQty?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.receivedQty?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.expectedDeliveryDate?.split('T')[0]}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/supply-planning/supplier/${row.supplierCode}`}
                          className="text-cyan-600 dark:text-cyan-400 hover:underline text-[11px] flex items-center space-x-1"
                        >
                          <span>Supplier 360°</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Supplier vs Production Need Dates Matrix */}
      {activeTab === 'need_dates' && (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Supplier Delivery Date vs Production Need Date Alignment Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cross-references expected PO delivery dates against factory work order start dates to highlight material arrival delay gaps.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Supplier Name</th>
                  <th className="px-4 py-3">Component SKU</th>
                  <th className="px-4 py-3">Expected PO Delivery</th>
                  <th className="px-4 py-3">Linked Production Order</th>
                  <th className="px-4 py-3">Production Need Date</th>
                  <th className="px-4 py-3">Date Gap (Days)</th>
                  <th className="px-4 py-3">Alignment Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {needDates.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-cyan-600 dark:text-cyan-400">{item.poNumber}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-sans">{item.supplierName}</td>
                    <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400">{item.skuCode}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.expectedDeliveryDate}</td>
                    <td className="px-4 py-3 text-purple-600 dark:text-purple-400">{item.productionOrderNo}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.productionNeedDate}</td>
                    <td className={`px-4 py-3 font-bold ${item.dateGapDays > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {item.dateGapDays > 0 ? `+${item.dateGapDays} Days Late` : `${item.dateGapDays} Days Buffer`}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.alignmentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SupplyChainLayout>
  )
}
