'use client'

import { useRef, useState, useEffect } from 'react'
import { upload } from '@vercel/blob/client'
import StatusDot from '@/components/StatusDot'
import { IconUpload } from '@/components/Icons'
import { PostStatus } from '@/lib/types'

type Platform = 'youtube' | 'instagram' | 'tiktok'

interface PlatStatus {
  state: PostStatus
  message: string
}

const initialStatus = (): Record<Platform, PlatStatus> => ({
  youtube:   { state: 'idle', message: '' },
  instagram: { state: 'idle', message: '' },
  tiktok:    { state: 'idle', message: '' },
})

async function safeJson(res: Response) {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { error: text || `HTTP ${res.status}` } }
}

export default function PostPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [ttPrivacy, setTtPrivacy] = useState('SELF_ONLY')
  const [statuses, setStatuses] = useState<Record<Platform, PlatStatus>>(initialStatus())
  const [running, setRunning] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__uploadRunning = running
    if (!running) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => { window.removeEventListener('beforeunload', handler) }
  }, [running])

  function setStatus(platform: Platform, state: PostStatus, message = '') {
    setStatuses(s => ({ ...s, [platform]: { state, message } }))
  }

  function setAllStatus(state: PostStatus, message = '') {
    setStatuses({
      youtube:   { state, message },
      instagram: { state, message },
      tiktok:    { state, message },
    })
  }

  type PlatResult = { success: true; url?: string } | { success: false; error: string }

  async function postYouTube(blobUrl: string): Promise<{ url: string | null; result: PlatResult }> {
    if (!file) return { url: null, result: { success: false, error: 'No file' } }
    setStatus('youtube', 'uploading', 'posting to YouTube...')
    const res = await fetch('/api/post/youtube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blobUrl,
        title: file.name.replace(/\.[^.]+$/, ''),
        description: caption,
        privacy,
        size: file.size,
        type: file.type || 'video/mp4',
      }),
    })
    const data = await safeJson(res)
    if (data.error) { setStatus('youtube', 'failed', data.error); return { url: null, result: { success: false, error: data.error } } }
    setStatus('youtube', 'success')
    return { url: data.videoUrl ?? null, result: { success: true, url: data.videoUrl ?? undefined } }
  }

  async function postInstagram(blobUrl: string): Promise<{ url: string | null; result: PlatResult }> {
    if (!file) return { url: null, result: { success: false, error: 'No file' } }
    setStatus('instagram', 'uploading', 'posting to Instagram...')
    const res = await fetch('/api/post/instagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: blobUrl, caption }),
    })
    const data = await safeJson(res)
    if (data.error) { setStatus('instagram', 'failed', data.error); return { url: null, result: { success: false, error: data.error } } }
    setStatus('instagram', 'success')
    return { url: data.postUrl ?? null, result: { success: true, url: data.postUrl ?? undefined } }
  }

  async function postTikTok(blobUrl: string): Promise<{ url: null; result: PlatResult }> {
    if (!file) return { url: null, result: { success: false, error: 'No file' } }
    setStatus('tiktok', 'uploading', 'posting to TikTok...')
    const res = await fetch('/api/post/tiktok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blobUrl, caption, privacy: ttPrivacy, size: file.size }),
    })
    const data = await safeJson(res)
    if (data.error) { setStatus('tiktok', 'failed', data.error); return { url: null, result: { success: false, error: data.error } } }
    setStatus('tiktok', 'success')
    return { url: null, result: { success: true } }
  }

  async function handlePostAll() {
    if (!file) return
    setRunning(true)
    setAllStatus('uploading', 'uploading...')

    let blobUrl: string
    try {
      const ext = (file.name.split('.').pop() || 'mp4').toLowerCase()
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      let lastPct = -1
      const blob = await upload(safeName, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
        onUploadProgress: ({ percentage }: { percentage: number }) => {
          const pct = Math.round(percentage)
          if (pct >= lastPct + 5 || pct === 100) {
            lastPct = pct
            setAllStatus('uploading', `uploading ${pct}%...`)
          }
        },
      })
      blobUrl = blob.url
      setAllStatus('uploading', 'sending to platforms...')
    } catch (e) {
      const msg = `Upload failed: ${String(e)}`
      setAllStatus('failed', msg)
      setRunning(false)
      return
    }

    const errResult = (e: unknown, p: Platform): { url: null; result: PlatResult } => {
      setStatus(p, 'failed', String(e))
      return { url: null, result: { success: false, error: String(e) } }
    }
    const [yt, ig, tt] = await Promise.all([
      postYouTube(blobUrl).catch(e => errResult(e, 'youtube')),
      postInstagram(blobUrl).catch(e => errResult(e, 'instagram')),
      postTikTok(blobUrl).catch(e => errResult(e, 'tiktok')),
    ])
    const ytUrl = yt.url
    const igUrl = ig.url

    fetch('/api/blob/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: blobUrl }),
    }).catch(() => {})

    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoName: file.name,
        results: { youtube: yt.result, instagram: ig.result, tiktok: tt.result },
      }),
    }).catch(() => {})

    const platforms: Platform[] = []
    if (ytUrl) platforms.push('youtube')
    if (igUrl) platforms.push('instagram')

    if (platforms.length > 0 || ytUrl || igUrl) {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          entry: {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            video_name: file.name,
            platforms,
            caption,
            youtube_url: ytUrl ?? undefined,
            instagram_url: igUrl ?? undefined,
          },
        }),
      }).catch(() => {})
    }

    setRunning(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.type.startsWith('video/')) setFile(dropped)
  }

  return (
    <div style={{ maxWidth: 680, width: '100%', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="h1">Post</h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>Upload once, post everywhere simultaneously</p>
      </div>

      {/* Drop zone */}
      <div
        className="card"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && fileRef.current?.click()}
        style={{
          padding: 28,
          marginBottom: 16,
          cursor: file ? 'default' : 'pointer',
          border: dragging
            ? '1px dashed var(--accent)'
            : file
            ? '1px solid var(--border)'
            : '1px dashed var(--border)',
          background: dragging ? 'oklch(0.80 0.16 80 / 0.06)' : undefined,
          transition: 'all 150ms ease',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: file ? 'oklch(0.80 0.16 80 / 0.15)' : 'var(--surface-2)',
          border: `1px solid ${file ? 'oklch(0.80 0.16 80 / 0.3)' : 'var(--border)'}`,
          display: 'grid', placeItems: 'center', flexShrink: 0,
          color: file ? 'var(--accent)' : 'var(--text-mute)',
        }}>
          <IconUpload size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {file ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 2 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-dim)' }}>Drop video here or click to browse</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 2 }}>MP4, MOV, WebM supported</div>
            </>
          )}
        </div>
        {file && (
          <button
            className="btn ghost tiny"
            onClick={e => { e.stopPropagation(); setFile(null); setStatuses(initialStatus()) }}
          >
            Change
          </button>
        )}
      </div>

      {/* Caption */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 10 }}>
          <span className="micro" style={{ display: 'block', marginBottom: 8 }}>Caption / Description</span>
          <textarea
            className="textarea"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={4}
            placeholder="Caption for Instagram + TikTok / Description for YouTube..."
          />
        </label>
      </div>

      {/* Privacy settings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {/* YouTube privacy */}
        <div className="card" style={{ padding: 16 }}>
          <div className="micro" style={{ marginBottom: 12 }}>YouTube</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['unlisted', 'public', 'private'].map(p => (
              <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="yt-privacy"
                  value={p}
                  checked={privacy === p}
                  onChange={() => setPrivacy(p)}
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                />
                <span style={{ fontSize: 12, textTransform: 'capitalize', color: privacy === p ? 'var(--text)' : 'var(--text-dim)', fontWeight: privacy === p ? 500 : 400 }}>
                  {p}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Instagram privacy */}
        <div className="card" style={{ padding: 16 }}>
          <div className="micro" style={{ marginBottom: 12 }}>Instagram</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="ig-privacy" checked readOnly style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
              <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>Public</span>
            </label>
            <p style={{ fontSize: 11, color: 'var(--text-mute)', lineHeight: 1.4 }}>Always public via API</p>
          </div>
        </div>

        {/* TikTok privacy */}
        <div className="card" style={{ padding: 16 }}>
          <div className="micro" style={{ marginBottom: 12 }}>TikTok</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['SELF_ONLY', 'Only me'], ['FOLLOWER_OF_CREATOR', 'Followers'], ['PUBLIC_TO_EVERYONE', 'Public']].map(([val, lbl]) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="tt-privacy"
                  value={val}
                  checked={ttPrivacy === val}
                  onChange={() => setTtPrivacy(val)}
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                />
                <span style={{ fontSize: 12, color: ttPrivacy === val ? 'var(--text)' : 'var(--text-dim)', fontWeight: ttPrivacy === val ? 500 : 400 }}>
                  {lbl}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Post button */}
      <button
        onClick={handlePostAll}
        disabled={!file || running}
        className="btn primary big"
        style={{ width: '100%', marginBottom: 16 }}
      >
        {running ? 'Posting…' : 'Post to all platforms →'}
      </button>

      {/* Status panel */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="micro">Status</span>
          {running && <span style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <StatusDot platform="youtube"   state={statuses.youtube.state}   message={statuses.youtube.message} />
          <StatusDot platform="instagram" state={statuses.instagram.state} message={statuses.instagram.message} />
          <StatusDot platform="tiktok"    state={statuses.tiktok.state}    message={statuses.tiktok.message} />
        </div>
      </div>
    </div>
  )
}
