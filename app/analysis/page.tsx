'use client'

import { useEffect, useRef, useState } from 'react'
import AnalysisResult from '@/components/AnalysisResult'
import PlatformMetrics from '@/components/PlatformMetrics'
import { VideoAnalysis, PlatformPost, PlatformMetricsData } from '@/lib/types'

// ── Upload path helpers ────────────────────────────────────────────────────

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

// ── Post card ──────────────────────────────────────────────────────────────

function PostCard({
  post,
  platform,
  selected,
  onClick,
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
      className={`w-full text-left flex gap-3 p-3 rounded-xl border transition-all ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-surface2 hover:border-primary/40 hover:bg-surface2/80'
      }`}
    >
      {post.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.thumbnail}
          alt=""
          className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-border"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-border flex items-center justify-center text-text-muted text-xs">
          {platform === 'youtube' ? 'YT' : 'IG'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text leading-snug mb-1">{snippet}</p>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{date}</span>
          {plays !== undefined && <span>{plays.toLocaleString()} {platform === 'youtube' ? 'views' : 'plays'}</span>}
          {likes !== undefined && <span>{likes.toLocaleString()} likes</span>}
        </div>
      </div>
    </button>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

type Mode = 'upload' | 'platform'
type Platform = 'instagram' | 'youtube'

export default function AnalysisPage() {
  // shared
  const [mode, setMode] = useState<Mode>('platform')
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState('')

  // upload mode
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  // platform mode
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [posts, setPosts] = useState<PlatformPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [postsError, setPostsError] = useState('')
  const [selectedPost, setSelectedPost] = useState<PlatformPost | null>(null)
  const [metrics, setMetrics] = useState<PlatformMetricsData | null>(null)

  const isLarge = file ? file.size > 25 * 1024 * 1024 : false

  // Fetch posts when platform tab changes
  useEffect(() => {
    if (mode !== 'platform') return
    setSelectedPost(null)
    setPosts([])
    setPostsError('')
    setAnalysis(null)
    setTranscript('')
    setMetrics(null)
    setError('')
    fetchPosts(platform)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, mode])

  async function fetchPosts(p: Platform) {
    setLoadingPosts(true)
    setPostsError('')
    try {
      const url = p === 'instagram'
        ? '/api/platforms/instagram'
        : '/api/platforms/youtube/videos'
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

  // ── Upload mode run ──────────────────────────────────────────────────────

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

  // ── Platform mode run ────────────────────────────────────────────────────

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
        // Instagram: use caption text
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

  // ── Save ─────────────────────────────────────────────────────────────────

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
    <div className="max-w-3xl mx-auto w-full">
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-lg mb-8">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-text mb-6">Analyze Video Content</h1>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-surface2 rounded-xl border border-border mb-6 w-fit">
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
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'bg-primary text-white shadow'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {m === 'platform' ? 'From Platform' : 'Upload File'}
              </button>
            ))}
          </div>

          {/* ── Platform mode ── */}
          {mode === 'platform' && (
            <div className="mb-6">
              {/* Platform selector */}
              <div className="flex gap-2 mb-4">
                {(['instagram', 'youtube'] as Platform[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors capitalize ${
                      platform === p
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-border text-text-muted hover:text-text hover:border-primary/40'
                    }`}
                  >
                    {p === 'instagram' ? 'Instagram' : 'YouTube'}
                  </button>
                ))}
              </div>

              {/* Post list */}
              {loadingPosts ? (
                <div className="text-sm text-text-muted py-6 text-center">Loading posts…</div>
              ) : postsError ? (
                <div className="bg-red/10 border border-red/30 text-red px-4 py-3 rounded-lg text-sm">
                  {postsError}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-sm text-text-muted py-6 text-center">No recent posts found.</div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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

              {platform === 'instagram' && !postsError && (
                <p className="text-xs text-text-muted mt-2">
                  Analysis uses the post caption. Metrics pulled live from Instagram.
                </p>
              )}
              {platform === 'youtube' && !postsError && (
                <p className="text-xs text-text-muted mt-2">
                  Analysis uses YouTube&apos;s built-in captions. Reconnect Google account in Settings if captions fail.
                </p>
              )}
            </div>
          )}

          {/* ── Upload mode ── */}
          {mode === 'upload' && (
            <div className="mb-6">
              <div className="flex items-center gap-4">
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*,audio/*"
                  className="hidden"
                  onChange={e => {
                    setFile(e.target.files?.[0] ?? null)
                    setTranscript('')
                    setAnalysis(null)
                    setError('')
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="bg-surface2 hover:bg-border text-text font-medium py-2.5 px-5 rounded-lg border border-border transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  Browse Video
                </button>
                <span className={`text-sm truncate flex-1 ${file ? 'text-text' : 'text-text-muted italic'}`}>
                  {file ? file.name : 'No file selected'}
                </span>
                {isLarge && (
                  <span className="text-yellow text-xs font-semibold px-2 py-1 bg-yellow/10 rounded border border-yellow/20">
                    Large file — audio will be extracted
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Run button */}
          <button
            onClick={mode === 'upload' ? handleUploadRun : handlePlatformRun}
            disabled={!canRun}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-md mb-6 ${
              !canRun
                ? 'bg-surface2 text-dim cursor-not-allowed border border-border'
                : 'bg-primary hover:bg-primary-hover text-white cursor-pointer border border-transparent shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] hover:-translate-y-0.5'
            }`}
          >
            {running ? (status || 'WORKING…') : 'ANALYZE'}
          </button>

          {error && (
            <div className="bg-red/10 border border-red/30 text-red px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          {transcript && (
            <div className="mb-8">
              <div className="text-text-muted text-xs font-semibold mb-3 tracking-wider uppercase">
                {mode === 'platform' && platform === 'instagram' ? 'Caption' : 'Transcript'}
              </div>
              <textarea
                readOnly
                value={transcript}
                rows={6}
                className="w-full bg-surface2 border border-border text-text rounded-xl p-4 text-sm leading-relaxed focus:outline-none resize-y"
              />
            </div>
          )}

          {(metrics || analysis) && (
            <div className="space-y-6">
              {metrics && <PlatformMetrics metrics={metrics} />}
              {analysis && <AnalysisResult analysis={analysis} />}
              {analysis && (
                <button
                  onClick={handleSave}
                  className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors border ${
                    saved
                      ? 'bg-green/10 border-green/30 text-green'
                      : 'bg-surface2 hover:bg-border border-border text-text'
                  }`}
                >
                  {saved ? '✓ SAVED TO DRIVE' : 'SAVE TO DRIVE'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
