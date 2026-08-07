'use client'

import React, { useState, useEffect } from 'react'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'

export default function DataSourcesPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSources() {
      setLoading(true)
      try {
        const res = await fetch('/api/v1/supply-planning?action=data_sources')
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        }
      } catch (e) {
        console.error('Failed to fetch data sources:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchSources()
  }, [])

  const categories = data?.categories || []
  const rules = data?.planningRulesDetail || []

  return (
    <SupplyChainLayout activeTitle="Input & Data Sources Module (Planning Lineage & Provenance)">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>Input & Data Sources Control Center</h1>
        <p>
          This module documents the origin, data lineage, and business rules for all inputs feeding the Supply Planning System.
          It explains where every planning output (Master Supply Grid, Capacity Heatmaps, PO Release Queue, Risk Alerts, and SLA Metrics) derives from.
        </p>
      </header>

      {loading ? (
        <p>Loading Data Source Provenance Contracts...</p>
      ) : (
        <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Summary Telemetry Metadata */}
          <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
            <h2>Ingestion & Data Provenance Metadata</h2>
            <ul>
              <li><strong>Total Data Categories:</strong> {data?.totalCategories}</li>
              <li><strong>Total Records Ingested:</strong> {data?.totalRecordsIngested?.toLocaleString()}</li>
              <li><strong>System Ingestion Health:</strong> {data?.overallHealth}</li>
            </ul>
          </section>

          {/* 8 Categories Data Provenance Table */}
          <section>
            <h2>Planning Input & Output Mapping Matrix</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} border="1">
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ padding: '8px' }}>Category Name</th>
                  <th style={{ padding: '8px' }}>Description & Purpose</th>
                  <th style={{ padding: '8px' }}>Source Collections</th>
                  <th style={{ padding: '8px' }}>Source Type</th>
                  <th style={{ padding: '8px' }}>Records</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Impacted Planning Outputs</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.categoryId}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{cat.categoryName}</td>
                    <td style={{ padding: '8px' }}>{cat.description}</td>
                    <td style={{ padding: '8px' }}><code>{cat.collectionsUsed.join(', ')}</code></td>
                    <td style={{ padding: '8px' }}>{cat.sourceType}</td>
                    <td style={{ padding: '8px' }}>{cat.recordCount?.toLocaleString()}</td>
                    <td style={{ padding: '8px' }}>{cat.healthStatus}</td>
                    <td style={{ padding: '8px' }}>
                      <ul>
                        {cat.impactedPlanningOutputs.map((out, idx) => (
                          <li key={idx}>{out}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Section: Detailed Category Schema Contracts */}
          <section>
            <h2>Detailed Schema Contracts by Input Category</h2>
            {categories.map((cat) => (
              <details key={cat.categoryId} style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #ddd' }}>
                <summary style={{ fontWeight: 'bold', cursor: 'pointer' }}>
                  {cat.categoryName} ({cat.categoryId}) • {cat.collectionsUsed.join(', ')}
                </summary>
                <div style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                  <p><strong>Source Protocol:</strong> {cat.sourceType} | <strong>Last Sync:</strong> {new Date(cat.lastSyncTime).toLocaleString()}</p>
                  <p><strong>Primary Schema Fields:</strong> <code>{cat.schemaFields.join(', ')}</code></p>
                  <p><strong>Derivation Mechanism:</strong> Supplies foundational parameters to downstream MRP engine for calculating planned production, purchase requisitions, and capacity loads.</p>
                </div>
              </details>
            ))}
          </section>

          {/* Section: Configured Planning Rules */}
          <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
            <h2>Planning Rules & Business Formulas</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} border="1">
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ padding: '8px' }}>Rule Code</th>
                  <th style={{ padding: '8px' }}>Rule Name</th>
                  <th style={{ padding: '8px' }}>Mathematical / Logical Formula</th>
                  <th style={{ padding: '8px' }}>Functional Scope</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.ruleId}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{rule.ruleId}</td>
                    <td style={{ padding: '8px' }}>{rule.ruleName}</td>
                    <td style={{ padding: '8px' }}><code>{rule.formula}</code></td>
                    <td style={{ padding: '8px' }}>{rule.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      )}
    </SupplyChainLayout>
  )
}
