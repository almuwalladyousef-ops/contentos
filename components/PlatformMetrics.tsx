'use client'

import { PlatformMetricsData } from '@/lib/types'

function formatNum(n?: number): string {
  if (n === undefined) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatWatchTime(ms?: number): string {
  if (ms === undefined) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      padding: '10px 14px',
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      minWidth: 74,
    }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{value}</span>
      <span className="micro" style={{ fontSize: 9.5 }}>{label}</span>
    </div>
  )
}

export default function PlatformMetrics({ metrics }: { metrics: PlatformMetricsData }) {
  const isYT = metrics.platform === 'youtube'

  return (
    <div style={{
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      background: 'oklch(0.215 0.014 255 / 0.5)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div style={{ background: 'var(--surface-2)', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
        <span className="micro">{isYT ? 'YouTube' : 'Instagram'} Performance</span>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {isYT ? (
            <>
              <Stat label="Views"    value={formatNum(metrics.views)} />
              <Stat label="Likes"    value={formatNum(metrics.likes)} />
              <Stat label="Comments" value={formatNum(metrics.comments)} />
            </>
          ) : (
            <>
              <Stat label="Plays"    value={formatNum(metrics.plays)} />
              <Stat label="Reach"    value={formatNum(metrics.reach)} />
              <Stat label="Likes"    value={formatNum(metrics.likes)} />
              <Stat label="Comments" value={formatNum(metrics.comments)} />
              <Stat label="Saves"    value={formatNum(metrics.saves)} />
              <Stat label="Shares"   value={formatNum(metrics.shares)} />
              {metrics.avgWatchTimeMs !== undefined && (
                <Stat label="Avg Watch" value={formatWatchTime(metrics.avgWatchTimeMs)} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
