'use client'

import React, { useEffect, useState } from 'react'
import AnalysisResult from '@/components/AnalysisResult'
import { PlatformIcon } from '@/components/Icons'
import { PostRecord, VideoAnalysis } from '@/lib/types'

export default function HistoryPage() {
  const [history, setHistory] = useState<PostRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<Record<string, VideoAnalysis>>({})

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(data => { setHistory(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  async function handleClear() {
    if (!confirm('Clear all history? This cannot be undone.')) return
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    })
    setHistory([])
  }

  async function handleExpand(entry: PostRecord) {
    if (expanded === entry.id) { setExpanded(null); return }
    setExpanded(entry.id)

    if (entry.analysis_file_id && !analyses[entry.id]) {
      const res = await fetch(`/api/drive/read?fileId=${entry.analysis_file_id}`)
      const data = await res.json()
      if (!data.error) setAnalyses(a => ({ ...a, [entry.id]: data }))
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-mute)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="h1">History</h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>{history.length} post{history.length !== 1 ? 's' : ''} recorded</p>
        </div>
        {history.length > 0 && (
          <button onClick={handleClear} className="btn danger tiny">
            Clear all
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-mute)',
          fontSize: 13,
        }}>
          No history yet
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 100px 1fr',
            padding: '10px 20px',
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--border)',
          }}>
            {['DATE', 'VIDEO', 'PLATFORMS', 'CAPTION'].map(h => (
              <span key={h} className="micro" style={{ fontSize: 10 }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {history.map((entry, idx) => (
            <React.Fragment key={entry.id}>
              <div
                onClick={() => handleExpand(entry)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 100px 1fr',
                  padding: '14px 20px',
                  borderBottom: idx < history.length - 1 || expanded === entry.id ? '1px solid var(--hairline)' : 'none',
                  cursor: 'pointer',
                  background: expanded === entry.id ? 'var(--surface-2)' : 'transparent',
                  transition: 'background 120ms ease',
                  alignItems: 'center',
                }}
                onMouseEnter={e => {
                  if (expanded !== entry.id) (e.currentTarget as HTMLDivElement).style.background = 'oklch(0.215 0.014 255 / 0.4)'
                }}
                onMouseLeave={e => {
                  if (expanded !== entry.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-mute)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(entry.date).toLocaleDateString()}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>
                  {entry.video_name}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {entry.platforms.map(p => (
                    <span key={p} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24,
                      borderRadius: 6,
                      background: 'var(--surface)',
                      border: '1px solid var(--hairline)',
                      color: 'var(--text-2)',
                    }}>
                      <PlatformIcon platform={p} size={13} />
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.caption?.slice(0, 80) || '—'}
                </span>
              </div>

              {/* Expanded row */}
              {expanded === entry.id && (
                <div style={{ padding: '20px 24px', background: 'var(--bg-2)', borderBottom: idx < history.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                  {(entry.youtube_url || entry.instagram_url) && (
                    <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
                      {entry.youtube_url && (
                        <a
                          href={entry.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }}
                        >
                          YouTube ↗
                        </a>
                      )}
                      {entry.instagram_url && (
                        <a
                          href={entry.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }}
                        >
                          Instagram ↗
                        </a>
                      )}
                    </div>
                  )}
                  {analyses[entry.id] ? (
                    <AnalysisResult analysis={analyses[entry.id]} />
                  ) : entry.analysis_file_id ? (
                    <div style={{ fontSize: 13, color: 'var(--text-mute)' }}>Loading analysis…</div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-mute)', fontStyle: 'italic' }}>No analysis saved for this entry</div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
