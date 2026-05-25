'use client'

import { useRef, useState } from 'react'
import AnalysisResult from '@/components/AnalysisResult'
import PlatformMetrics from '@/components/PlatformMetrics'
import { IconUpload } from '@/components/Icons'
import { VideoAnalysis, PlatformPost, PlatformMetricsData } from '@/lib/types'

// ── WAV encoder ───────────────────────────────────────────────────────────────

function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = 1
  const sampleRate = audioBuffer.sampleRate
  const samples = audioBuffer.getChannelData(0)
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({
  post, platform, selected, onClick,
}: {
  post: PlatformPost
  platform: 'instagram' | 'youtube'
  selected: boolean
  onClick: () => void
}) {
  const label = platform === 'youtube' ? post.title : post.caption
  const snippet = label ? (label.length > 80 ? label.slice(0, 80) + '…' : label) : 'No caption'
  const date = new Date(post.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const plays = platform === 'youtube' ? post.metrics.views : post.metrics.plays
  const likes = post.metrics.likes

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        gap: 12,
        padding: 12,
        borderRadius: 10,
        border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
        background: selected ? 'oklch(0.80 0.16 80 / 0.08)' : 'var(--surface-2)',
        transition: 'all 120ms ease',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = 'oklch(0.80 0.16 80 / 0.5)'
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
      }}
    >
      {post.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumbnail} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: 'var(--border)' }} />
      ) : (
        <div style={{ width: 60, height: 60, borderRadius: 8, flexShrink: 0, background: 'var(--border)', display: 'grid', placeItems: 'center', color: 'var(--text-mute)', fontSize: 11, fontWeight: 600 }}>
          {platform === 'youtube' ? 'YT' : 'IG'}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4, margin: '0 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{snippet}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, color: 'var(--text-mute)' }}>
          <span>{date}</span>
          {plays !== undefined && <span>{plays.toLocaleString()} {platform === 'youtube' ? 'views' : 'plays'}</span>}
          {likes !== undefined && <span>{likes.toLocaleString()} likes</span>}
        </div>
      </div>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Mode = 'upload' | 'platform'
type Platform = 'instagram' | 'youtube'

export default function AnalysisPage() {
  const [mode, setMode] = useState<Mode>('platform')
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  const [platform, setPlatform] = useState<Platform>('instagram')
  const [posts, setPosts] = useState<PlatformPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [postsError, setPostsError] = useState('')
  const [selectedPost, setSelectedPost] = useState<PlatformPost | null>(null)
  const [metrics, setMetrics] = useState<PlatformMetricsData | null>(null)

  const isLarge = file ? file.size > 25 * 1024 * 1024 : false

  async function fetchPosts(p: Platform) {
    setLoadingPosts(true)
    setPostsError('')
    try {
      const url = p === 'instagram' ? '/api/platforms/instagram' : '/api/platforms/youtube/videos'
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) { setPostsError(data.error); return }
      setPosts(data.posts ?? [])
    } catch (e: unknown) {
      setPostsError(String(e))
    } finally {
      setLoadingPosts(false)
    }
  }

  async function handleUploadRun() {
    if (!file) return
    setRunning(true)
    setError('')
    setTranscript('')
    setAnalysis(null)
    setMetrics(null)
    setSaved(false)

    try {
      setStatus('extracting audio...')
      let audioFile: File | Blob = file

      if (file.size > 25 * 1024 * 1024) {
        const arrayBuf = await file.arrayBuffer()
        const audioCtx = new AudioContext({ sampleRate: 16000 })
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuf)
        await audioCtx.close()
        const wavBlob = encodeWAV(audioBuffer)
        audioFile = new File([wavBlob], file.name.replace(/\.[^.]+$/, '.wav'), { type: 'audio/wav' })
      }

      setStatus('transcribing with Groq Whisper...')
      const fd = new FormData()
      fd.append('file', audioFile, (audioFile as File).name ?? 'audio.wav')
      const tRes = await fetch('/api/transcribe', { method: 'POST', body: fd })
      const tData = await tRes.json()
      if (tData.error) throw new Error(tData.error)
      setTranscript(tData.transcript)

      setStatus('analyzing with Gemini...')
      const aRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: tData.transcript }),
      })
      const aData = await aRes.json()
      if (aData.error) throw new Error(aData.error)
      setAnalysis(aData.analysis)
      setStatus('')
    } catch (e: unknown) {
      setError(String(e))
      setStatus('')
    } finally {
      setRunning(false)
    }
  }

  async function handlePlatformRun() {
    if (!selectedPost) return
    setRunning(true)
    setError('')
    setTranscript('')
    setAnalysis(null)
    setMetrics(selectedPost.metrics)
    setSaved(false)

    try {
      let text = ''

      if (platform === 'youtube') {
        setStatus('fetching YouTube captions...')
        const tRes = await fetch(`/api/platforms/youtube/transcript?videoId=${selectedPost.id}`)
        const tData = await tRes.json()
        if (tData.error) throw new Error(tData.error)
        text = tData.transcript
        setTranscript(text)
      } else {
        text = selectedPost.caption ?? ''
        if (!text) throw new Error('This post has no caption text to analyze.')
        setTranscript(text)
      }

      setStatus('analyzing with Gemini...')
      const aRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })
      const aData = await aRes.json()
      if (aData.error) throw new Error(aData.error)
      setAnalysis(aData.analysis)
      setStatus('')
    } catch (e: unknown) {
      setError(String(e))
      setStatus('')
    } finally {
      setRunning(false)
    }
  }

  async function handleSave() {
    if (!analysis || !transcript) return
    setSaved(false)
    try {
      const name = mode === 'upload'
        ? (file?.name.replace(/\.[^.]+$/, '') ?? 'video')
        : (selectedPost?.title ?? selectedPost?.caption?.slice(0, 40) ?? 'video')
      const timestamp = new Date().toISOString().slice(0, 10)

      await fetch('/api/drive/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, analysis, name, timestamp }),
      })

      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          entry: {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            video_name: name,
            platforms: selectedPost ? [platform] : [],
            caption: selectedPost?.caption ?? '',
          },
        }),
      })
      setSaved(true)
    } catch (e: unknown) {
      setError(String(e))
    }
  }

  const canRun = mode === 'upload' ? !!file && !running : !!selectedPost && !running

  return (
    <div style={{ maxWidth: 720, width: '100%', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="h1">Analysis</h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>Transcribe and analyze video content with AI</p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        {/* Mode tabs */}
        <div style={{
          display: 'flex',
          padding: 3,
          background: 'var(--surface)',
          border: '1px solid var(--hairline)',
          borderRadius: 10,
          marginBottom: 20,
          width: 'fit-content',
        }}>
          {(['platform', 'upload'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                setAnalysis(null)
                setTranscript('')
                setError('')
                setMetrics(null)
                setSaved(false)
                if (m === 'platform') {
                  setSelectedPost(null)
                  setPosts([])
                  setPostsError('')
                  fetchPosts(platform)
                }
              }}
              style={{
                padding: '6px 16px',
                borderRadius: 7,
                fontSize: 12.5,
                fontWeight: 600,
                color: mode === m ? 'var(--text)' : 'var(--text-mute)',
                background: mode === m ? 'var(--surface-3)' : 'transparent',
                transition: 'all 120ms ease',
                letterSpacing: '0.01em',
              }}
            >
              {m === 'platform' ? 'From Platform' : 'Upload File'}
            </button>
          ))}
        </div>

        {/* Platform mode */}
        {mode === 'platform' && (
          <div style={{ marginBottom: 20 }}>
            {/* Platform selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {(['instagram', 'youtube'] as Platform[]).map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setPlatform(p)
                    setSelectedPost(null)
                    setPosts([])
                    setPostsError('')
                    setAnalysis(null)
                    setTranscript('')
                    setMetrics(null)
                    setError('')
                    fetchPosts(p)
                  }}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 600,
                    border: platform === p ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: platform === p ? 'var(--accent)' : 'var(--text-dim)',
                    background: platform === p ? 'oklch(0.80 0.16 80 / 0.1)' : 'transparent',
                    transition: 'all 120ms ease',
                    textTransform: 'capitalize',
                  }}
                >
                  {p === 'instagram' ? 'Instagram' : 'YouTube'}
                </button>
              ))}
            </div>

            {/* Post list */}
            {loadingPosts ? (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--text-mute)' }}>Loading posts…</div>
            ) : postsError ? (
              <div style={{
                background: 'oklch(0.70 0.19 25 / 0.1)',
                border: '1px solid oklch(0.70 0.19 25 / 0.3)',
                color: 'var(--bad)',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
              }}>
                {postsError}
              </div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--text-mute)' }}>No recent posts found.</div>
            ) : (
              <div className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, paddingRight: 4 }}>
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    platform={platform}
                    selected={selectedPost?.id === post.id}
                    onClick={() => {
                      setSelectedPost(post)
                      setAnalysis(null)
                      setTranscript('')
                      setMetrics(null)
                      setError('')
                      setSaved(false)
                    }}
                  />
                ))}
              </div>
            )}

            {!postsError && (
              <p style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 8 }}>
                {platform === 'instagram'
                  ? 'Analysis uses the post caption. Metrics pulled live from Instagram.'
                  : "Analysis uses YouTube's built-in captions. Reconnect Google account in Settings if captions fail."}
              </p>
            )}
          </div>
        )}

        {/* Upload mode */}
        {mode === 'upload' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                ref={fileRef}
                type="file"
                accept="video/*,audio/*"
                style={{ display: 'none' }}
                onChange={e => {
                  setFile(e.target.files?.[0] ?? null)
                  setTranscript('')
                  setAnalysis(null)
                  setError('')
                }}
              />
              <button className="btn" onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <IconUpload size={14} />
                Browse file
              </button>
              <span style={{ fontSize: 13, color: file ? 'var(--text)' : 'var(--text-mute)', fontStyle: file ? 'normal' : 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file ? file.name : 'No file selected'}
              </span>
              {isLarge && (
                <span style={{
                  fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em',
                  padding: '3px 8px', borderRadius: 6,
                  background: 'oklch(0.82 0.15 80 / 0.12)',
                  border: '1px solid oklch(0.82 0.15 80 / 0.25)',
                  color: 'var(--warn)',
                  whiteSpace: 'nowrap',
                }}>
                  Large — audio only
                </span>
              )}
            </div>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={mode === 'upload' ? handleUploadRun : handlePlatformRun}
          disabled={!canRun}
          className="btn primary"
          style={{ width: '100%', height: 42, fontSize: 13 }}
        >
          {running ? (status || 'Working…') : 'Analyze →'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'oklch(0.70 0.19 25 / 0.1)',
          border: '1px solid oklch(0.70 0.19 25 / 0.3)',
          color: 'var(--bad)',
          padding: '12px 16px',
          borderRadius: 10,
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="micro" style={{ marginBottom: 10 }}>
            {mode === 'platform' && platform === 'instagram' ? 'Caption' : 'Transcript'}
          </div>
          <textarea
            readOnly
            value={transcript}
            rows={6}
            className="textarea"
            style={{ resize: 'vertical', background: 'var(--surface)', cursor: 'default' }}
          />
        </div>
      )}

      {/* Results */}
      {(metrics || analysis) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {metrics && <PlatformMetrics metrics={metrics} />}
          {analysis && <AnalysisResult analysis={analysis} />}
          {analysis && (
            <button
              onClick={handleSave}
              className="btn"
              style={saved ? {
                background: 'oklch(0.78 0.16 155 / 0.12)',
                borderColor: 'oklch(0.78 0.16 155 / 0.3)',
                color: 'var(--ok)',
              } : {}}
            >
              {saved ? '✓ Saved to Drive' : 'Save to Drive'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
