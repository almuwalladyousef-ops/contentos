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
    <div className="flex flex-col items-center gap-1 p-3 bg-surface2 rounded-lg border border-border min-w-[80px]">
      <span className="text-lg font-bold text-text">{value}</span>
      <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">{label}</span>
    </div>
  )
}

export default function PlatformMetrics({ metrics }: { metrics: PlatformMetricsData }) {
  const isYT = metrics.platform === 'youtube'

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-lg">
      <div className="bg-surface2 px-5 py-4 border-b border-border flex items-center gap-2">
        <span className="text-xs font-bold text-text-muted tracking-widest uppercase">
          {isYT ? 'YouTube' : 'Instagram'} Performance
        </span>
      </div>
      <div className="px-5 py-4">
        <div className="flex flex-wrap gap-3">
          {isYT ? (
            <>
              <Stat label="Views" value={formatNum(metrics.views)} />
              <Stat label="Likes" value={formatNum(metrics.likes)} />
              <Stat label="Comments" value={formatNum(metrics.comments)} />
            </>
          ) : (
            <>
              <Stat label="Plays" value={formatNum(metrics.plays)} />
              <Stat label="Reach" value={formatNum(metrics.reach)} />
              <Stat label="Likes" value={formatNum(metrics.likes)} />
              <Stat label="Comments" value={formatNum(metrics.comments)} />
              <Stat label="Saves" value={formatNum(metrics.saves)} />
              <Stat label="Shares" value={formatNum(metrics.shares)} />
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
