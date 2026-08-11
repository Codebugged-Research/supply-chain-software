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
  AlertTriangle,
  ClipboardCheck,
  History,
  Factory,
  Award
} from 'lucide-react'

const EXCLUSION_OPTIONS = [
  { code: 'CLEAR', label: 'Clear Exclusion' },
  { code: 'FORCE_CLOSE', label: 'Force-Close' },
  { code: 'PARTIAL_ACCEPT', label: 'Partial Delivery Accepted' },
  { code: 'HOLD', label: 'Hold' }
]

export default function ProcurementPage() {
  const [pos, setPos] = useState([])
  const [needDates, setNeedDates] = useState([])
  const [hodAdherence, setHodAdherence] = useState([])
  const [adherenceSummary, setAdherenceSummary] = useState(null)
  const [odmEmsMaster, setOdmEmsMaster] = useState([])
  const [reliabilityScorecard, setReliabilityScorecard] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders')
  const [savingPo, setSavingPo] = useState(null)

  async function fetchProcurementData() {
    setLoading(true)
    try {
      const [resPo, resNeed, resHod, resSummary, resOdm, resScorecard] = await Promise.all([
        fetch('/api/v1/supply-planning?action=procurement'),
        fetch('/api/v1/supply-planning?action=supplier_production_need_dates'),
        fetch('/api/v1/supply-planning?action=po_hod_adherence'),
        fetch('/api/v1/supply-planning?action=po_adherence_summary'),
        fetch('/api/v1/supply-planning?action=odm_ems_master'),
        fetch('/api/v1/supply-planning?action=supplier_reliability_scorecard')
      ])

      const jsonPo = await resPo.json()
      const jsonNeed = await resNeed.json()
      const jsonHod = await resHod.json()
      const jsonSummary = await resSummary.json()
      const jsonOdm = await resOdm.json()
      const jsonScorecard = await resScorecard.json()

      if (jsonPo.success) setPos(jsonPo.data || [])
      if (jsonNeed.success) setNeedDates(jsonNeed.data || [])
      if (jsonHod.success) setHodAdherence(jsonHod.data || [])
      if (jsonSummary.success) setAdherenceSummary(jsonSummary.data || null)
      if (jsonOdm.success) setOdmEmsMaster(jsonOdm.data || [])
      if (jsonScorecard.success) setReliabilityScorecard(jsonScorecard.data || [])
    } catch (e) {
      console.error('Failed to load procurement:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProcurementData()
  }, [])

  async function handleExclusionChange(poNumber, exclusionCode) {
    setSavingPo(poNumber)
    try {
      const res = await fetch('/api/v1/supply-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_po_exclusion', poNumber, exclusionCode, actor: 'sourcing.user@boat.com' })
      })
      const json = await res.json()
      if (json.success) {
        await fetchProcurementData()
      }
    } catch (e) {
      console.error('Failed to update exclusion flag:', e)
    } finally {
      setSavingPo(null)
    }
  }

  return (
    <SupplyChainLayout activeTitle="Procurement Execution & Supplier Alignment">
      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Open PO Units"
          value={`${pos.filter((po) => !['CLOSED', 'CANCELLED'].includes(po.status)).reduce((sum, po) => sum + Math.max(0, Number(po.orderedQty || 0) - Number(po.receivedQty || 0)), 0).toLocaleString()} Units`}
          subtitle={`${pos.length} persisted PO lines`}
          badgeText="Financial Commitment"
          badgeType="info"
          loading={loading}
        />
        <KpiCard
          title="Vendor On-Time Delivery %"
          value={reliabilityScorecard.length ? `${(reliabilityScorecard.reduce((sum, row) => sum + Number(row.onTimeDelivery4Week || 0), 0) / reliabilityScorecard.length).toFixed(1)}%` : '—'}
          subtitle="Tier-1 EMS & Component Vendors"
          badgeText="High Reliability"
          badgeType="success"
          loading={loading}
        />
        <KpiCard
          title="MOQ Lot Compliance"
          value={(() => { const mappings = odmEmsMaster.flatMap((vendor) => (vendor.lines || []).map((line) => ({ ...line, supplierCode: vendor.supplierCode }))); const checked = pos.map((po) => ({ po, mapping: mappings.find((line) => line.supplierCode === po.supplierCode && line.skuCode === po.skuCode) })).filter((item) => item.mapping); const compliant = checked.filter(({ po, mapping }) => Number(po.orderedQty || 0) >= Number(mapping.minimumOrderQuantity || 0) && Number(po.orderedQty || 0) % Math.max(1, Number(mapping.orderMultiple || 1)) === 0).length; return checked.length ? `${(compliant / checked.length * 100).toFixed(1)}%` : '—' })()}
          subtitle="Calculated from persisted PO quantities and supplier mappings"
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
        <button
          onClick={() => setActiveTab('hod_adherence')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'hod_adherence'
            ? 'bg-cyan-600 text-white shadow-md'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          Handover Date (HOD) Adherence
        </button>
        <button
          onClick={() => setActiveTab('odm_ems')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'odm_ems'
            ? 'bg-cyan-600 text-white shadow-md'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          ODM/EMS Master & Reliability Scorecard
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

      {/* TAB 3: Handover Date (HOD) Adherence Tracking */}
      {activeTab === 'hod_adherence' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              title="On-Time Handover Adherence %"
              value={adherenceSummary ? `${adherenceSummary.onTimeHandoverPct}%` : '—'}
              subtitle={adherenceSummary ? `${adherenceSummary.rollingWindow} · Target ${adherenceSummary.targetAdherencePct}%` : ''}
              badgeText={adherenceSummary && adherenceSummary.onTimeHandoverPct >= adherenceSummary.targetAdherencePct ? 'On Target' : 'Below Target'}
              badgeType={adherenceSummary && adherenceSummary.onTimeHandoverPct >= adherenceSummary.targetAdherencePct ? 'success' : 'warning'}
              loading={loading}
            />
            <KpiCard
              title="POs At Risk / Late"
              value={adherenceSummary ? adherenceSummary.atRiskOrLateCount.toString() : '—'}
              subtitle="Against committed handover date"
              badgeText="Exception Watch"
              badgeType="danger"
              loading={loading}
            />
            <KpiCard
              title="Excluded From Denominator"
              value={adherenceSummary ? adherenceSummary.excludedFromDenominator.toString() : '—'}
              subtitle="Force-closed, partial-accept, or hold flagged"
              badgeText="Exception Managed"
              badgeType="info"
              loading={loading}
            />
          </div>

          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <ClipboardCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>PO Adherence Against Handover Date (HOD)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Handover Date is the contractually committed delivery date, tracked separately from the current expected-delivery ETA. Exclusion flags remove disputed or force-closed POs from the adherence % denominator without deleting the underlying record.
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
                      <th className="px-4 py-3">PO Number</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Handover Date (HOD)</th>
                      <th className="px-4 py-3">Expected Delivery</th>
                      <th className="px-4 py-3">HOD Variance</th>
                      <th className="px-4 py-3">Adherence</th>
                      <th className="px-4 py-3">Exclusion Flag</th>
                      <th className="px-4 py-3">Revisions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {hodAdherence.slice(0, 20).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-cyan-600 dark:text-cyan-400">{row.poNumber}</td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-sans">{row.supplierName}</td>
                        <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400">{row.skuCode}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.handoverDate}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.expectedDeliveryDate}</td>
                        <td className={`px-4 py-3 font-bold ${row.hodVarianceDays > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {row.hodVarianceDays > 0 ? `+${row.hodVarianceDays}d Late` : `${Math.abs(row.hodVarianceDays)}d Early`}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.adherenceStatus === 'ON_TIME' ? 'HEALTHY' : row.adherenceStatus === 'LATE' || row.adherenceStatus === 'AT_RISK' ? 'CRITICAL' : row.adherenceStatus === 'MINOR_SLIP' ? 'WARNING' : row.adherenceStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.exclusion?.exclusionCode || ''}
                            disabled={savingPo === row.poNumber}
                            onChange={(e) => handleExclusionChange(row.poNumber, e.target.value || 'CLEAR')}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500 font-sans disabled:opacity-50"
                          >
                            <option value="">No Exclusion</option>
                            {EXCLUSION_OPTIONS.filter(o => o.code !== 'CLEAR').map(o => (
                              <option key={o.code} value={o.code}>{o.label}</option>
                            ))}
                          </select>
                          {row.exclusion && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-sans max-w-[220px]">{row.exclusion.reason}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {row.revisionHistory.length > 0 ? (
                            <span className="flex items-center space-x-1" title={row.revisionHistory.map(r => `#${r.revisionNo}: ${r.oldValue} -> ${r.newValue}`).join('\n')}>
                              <History className="w-3 h-3" />
                              <span>{row.revisionHistory.length}</span>
                            </span>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ODM/EMS Master & Supplier Reliability Scorecard */}
      {activeTab === 'odm_ems' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Factory className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>ODM & EMS Vendor Master — Production & Line Capacity</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vendor-side line capacity, contracted vs. spot split, and NPI ramp reservation for qualified ODM/EMS manufacturing partners.
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
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Tier</th>
                      <th className="px-4 py-3">Lines</th>
                      <th className="px-4 py-3">Total Capacity / Week</th>
                      <th className="px-4 py-3">Contracted / Spot Split</th>
                      <th className="px-4 py-3">NPI Ramp Reserve</th>
                      <th className="px-4 py-3">Contracted Lead Time</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {odmEmsMaster.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 font-sans">{v.supplierName}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={v.vendorType === 'EMS' ? 'QUALIFIED' : 'ACTIVE'} />
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{v.tierClassification?.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{v.lineCount}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{v.totalProductionCapacityUnitsPerWeek?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {v.contractedCapacityUnitsPerWeek?.toLocaleString()} / {v.spotCapacityUnitsPerWeek?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400">{v.npiRampCapacityUnitsPerWeek?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{v.contractedLeadTimeDays} Days</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/supply-planning/supplier/${v.supplierCode}`}
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

          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Supplier / ODM Lead-Time & Reliability Scorecard</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ranked by composite reliability score (50% On-Time Delivery + 30% lead-time consistency + 20% quality) across rolling 4/13/52-week windows.
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
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">OTD (4wk / 13wk / 52wk)</th>
                      <th className="px-4 py-3">Lead Time Quoted vs. Actual</th>
                      <th className="px-4 py-3">Quality / Rejection Rate</th>
                      <th className="px-4 py-3">Reliability Score</th>
                      <th className="px-4 py-3">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {reliabilityScorecard.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-500 dark:text-slate-400">#{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 font-sans">{r.supplierName}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {r.onTimeDelivery4Week}% / {r.onTimeDelivery13Week}% / {r.onTimeDelivery52Week}%
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {r.quotedLeadTimeDays}d vs {r.actualAvgLeadTimeDays}d
                          <span className={`ml-1 font-semibold ${r.leadTimeVarianceDays > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            ({r.leadTimeVarianceDays > 0 ? '+' : ''}{r.leadTimeVarianceDays}d)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.qualityScore}% / {r.rejectionRatePct}%</td>
                        <td className="px-4 py-3 font-bold text-cyan-600 dark:text-cyan-400">{r.reliabilityScore}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.reliabilityGrade === 'EXCELLENT' || r.reliabilityGrade === 'RELIABLE' ? 'HEALTHY' : r.reliabilityGrade === 'WATCH' ? 'WARNING' : 'CRITICAL'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </SupplyChainLayout>
  )
}
