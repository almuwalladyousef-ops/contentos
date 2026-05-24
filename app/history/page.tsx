'use client'

import React, { useEffect, useState } from 'react'
import AnalysisResult from '@/components/AnalysisResult'
import { PostRecord, VideoAnalysis } from '@/lib/types'

const platformTag: Record<string, string> = {
  youtube: '[YT]',
  instagram: '[IG]',
  tiktok: '[TT]',
}

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

  return (
    <div className="max-w-5xl mx-auto w-full">
      {loading ? (
        <div className="text-text-muted text-sm flex items-center justify-center py-20">Loading...</div>
      ) : history.length === 0 ? (
        <div className="text-text-muted text-sm flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-2xl bg-surface2/50">
          <p className="mb-2">No history yet</p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-lg mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface2 border-b border-border">
                  {['DATE', 'VIDEO', 'PLATFORMS', 'CAPTION'].map(h => (
                    <th key={h} className="py-4 px-6 text-xs font-semibold text-text-muted tracking-wider uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map(entry => (
                  <React.Fragment key={entry.id}>
                    <tr
                      onClick={() => handleExpand(entry)}
                      className={`cursor-pointer transition-colors ${
                        expanded === entry.id ? 'bg-surface2/80' : 'hover:bg-surface2/50'
                      }`}
                    >
                      <td className="py-4 px-6 text-sm text-text-muted whitespace-nowrap">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-text">
                        {entry.video_name}
                      </td>
                      <td className="py-4 px-6 text-xs whitespace-nowrap">
                        <div className="flex gap-2">
                          {entry.platforms.map(p => (
                            <span key={p} className="bg-bg border border-border text-text-muted px-2 py-1 rounded-md tracking-wider">
                              {platformTag[p]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-text-muted max-w-xs truncate">
                        {entry.caption?.slice(0, 80) || '—'}
                      </td>
                    </tr>
                    {expanded === entry.id && (
                      <tr key={`${entry.id}-expanded`} className="bg-bg/50">
                        <td colSpan={4} className="p-6 border-b border-border">
                          <div className="flex gap-4 mb-6 flex-wrap">
                            {entry.youtube_url && (
                              <a href={entry.youtube_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover text-sm font-medium underline underline-offset-2 transition-colors">
                                YouTube ↗
                              </a>
                            )}
                            {entry.instagram_url && (
                              <a href={entry.instagram_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover text-sm font-medium underline underline-offset-2 transition-colors">
                                Instagram ↗
                              </a>
                            )}
                          </div>
                          {analyses[entry.id] ? (
                            <AnalysisResult analysis={analyses[entry.id]} />
                          ) : entry.analysis_file_id ? (
                            <div className="text-text-muted text-sm animate-pulse">Loading analysis...</div>
                          ) : (
                            <div className="text-text-muted text-sm italic">No analysis saved for this entry</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 bg-surface2 border-t border-border flex justify-end">
            <button
              onClick={handleClear}
              className="bg-surface hover:bg-red/10 text-red font-medium py-2 px-4 rounded-lg border border-red/30 transition-colors focus:ring-2 focus:ring-red focus:outline-none text-sm"
            >
              Clear History
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
