'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import AnalysisResult from '@/components/AnalysisResult'
import { PostRecord, VideoAnalysis } from '@/lib/types'

const platformTag: Record<string, string> = {
  youtube: '[YT]',
  instagram: '[IG]',
  tiktok: '[TT]',
}

export default function HistoryPage() {
  const { data: session } = useSession()
  const [history, setHistory] = useState<PostRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<Record<string, VideoAnalysis>>({})

  useEffect(() => {
    if (!session) return
    fetch('/api/history')
      .then(r => r.json())
      .then(data => { setHistory(Array.isArray(data) ? data : []); setLoading(false) })
  }, [session])

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

  if (!session) return null

  return (
    <div style={{ maxWidth: '900px' }}>
      {loading ? (
        <div style={{ color: '#555', fontSize: '12px' }}>loading...</div>
      ) : history.length === 0 ? (
        <div style={{ color: '#555', fontSize: '12px' }}>no history yet</div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                {['DATE', 'VIDEO', 'PLATFORMS', 'CAPTION'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#555', fontSize: '11px', letterSpacing: '0.05em', fontWeight: 'normal' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(entry => (
                <>
                  <tr
                    key={entry.id}
                    onClick={() => handleExpand(entry)}
                    style={{
                      borderBottom: '1px solid #1e1e1e',
                      cursor: 'pointer',
                      background: expanded === entry.id ? '#161616' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#e0e0e0', fontSize: '12px' }}>
                      {entry.video_name}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '11px' }}>
                      {entry.platforms.map(p => (
                        <span key={p} style={{ color: '#555', marginRight: '6px' }}>{platformTag[p]}</span>
                      ))}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.caption?.slice(0, 80) || '—'}
                    </td>
                  </tr>
                  {expanded === entry.id && (
                    <tr key={`${entry.id}-expanded`}>
                      <td colSpan={4} style={{ padding: '16px 12px', background: '#111' }}>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                          {entry.youtube_url && (
                            <a href={entry.youtube_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: '12px' }}>YouTube ↗</a>
                          )}
                          {entry.instagram_url && (
                            <a href={entry.instagram_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: '12px' }}>Instagram ↗</a>
                          )}
                        </div>
                        {analyses[entry.id] ? (
                          <AnalysisResult analysis={analyses[entry.id]} />
                        ) : entry.analysis_file_id ? (
                          <div style={{ color: '#555', fontSize: '12px' }}>loading analysis...</div>
                        ) : (
                          <div style={{ color: '#555', fontSize: '12px' }}>no analysis saved for this entry</div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          <button
            onClick={handleClear}
            style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#ef4444', padding: '8px 16px', fontSize: '12px' }}
          >
            [CLEAR HISTORY]
          </button>
        </>
      )}
    </div>
  )
}
