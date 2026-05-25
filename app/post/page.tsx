'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { upload } from '@vercel/blob/client'
import StatusDot from '@/components/StatusDot'
import {
  IconUpload, IconFilm, IconX, IconArrowRight, IconClock,
  IconCheck, IconSparkles, LogoYouTube, LogoInstagram, LogoTikTok, PlatformIcon,
} from '@/components/Icons'
import { PostStatus } from '@/lib/types'

type Platform = 'youtube' | 'instagram' | 'tiktok'
type VideoType = 'short' | 'long'

interface PlatStatus { state: PostStatus; message: string }
const initialStatus = (): Record<Platform, PlatStatus> => ({
  youtube:   { state: 'idle', message: '' },
  instagram: { state: 'idle', message: '' },
  tiktok:    { state: 'idle', message: '' },
})

async function safeJson(res: Response) {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { error: text || `HTTP ${res.status}` } }
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 30, height: 18, borderRadius: 999, padding: 2,
        background: checked ? 'var(--accent)' : 'var(--surface-3)',
        display: 'flex',
        boxShadow: checked ? '0 0 8px var(--accent-glow)' : 'none',
        transition: 'all 180ms ease',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: 999,
        background: checked ? 'oklch(0.18 0.013 255)' : 'var(--text-mute)',
        marginLeft: checked ? 'auto' : 0,
        transition: 'all 180ms cubic-bezier(0.2, 0.7, 0.2, 1)',
      }} />
    </button>
  )
}

// ── Privacy radio ─────────────────────────────────────────────────────────────
function PrivacyRadio({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: (string | [string, string])[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {options.map(opt => {
        const val = Array.isArray(opt) ? opt[0] : opt
        const label = Array.isArray(opt) ? opt[1] : opt
        const active = value === val
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', borderRadius: 8, textAlign: 'left', width: '100%',
              background: active ? 'var(--accent-dim)' : 'transparent',
              border: `1px solid ${active ? 'oklch(0.80 0.16 80 / 0.4)' : 'transparent'}`,
              transition: 'background 120ms ease',
            }}
          >
            <span style={{
              width: 14, height: 14, borderRadius: 999, flexShrink: 0,
              border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
              display: 'grid', placeItems: 'center',
              background: active ? 'var(--accent)' : 'transparent',
            }}>
              {active && <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--bg)' }} />}
            </span>
            <span style={{ fontSize: 13, textTransform: 'capitalize', color: active ? 'var(--text)' : 'var(--text-dim)', fontWeight: active ? 500 : 400 }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Fake thumbnail for preview ────────────────────────────────────────────────
function FakeThumb({ width = 94, ratio = '9/16' }: { width?: number; ratio?: string }) {
  return (
    <div style={{
      width, aspectRatio: ratio, borderRadius: 8, flexShrink: 0,
      background: 'linear-gradient(160deg, oklch(0.32 0.06 250), oklch(0.22 0.04 280))',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', bottom: 4, left: 5, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'oklch(1 0 0 / 0.5)', letterSpacing: '0.1em' }}>0:00</div>
    </div>
  )
}

// ── Platform previews ─────────────────────────────────────────────────────────
function PreviewCard({ platform, label, color, enabled, children }: {
  platform: string; label: string; color: string; enabled: boolean; children: React.ReactNode
}) {
  return (
    <div className="card" style={{ padding: 14, opacity: enabled ? 1 : 0.4, transition: 'opacity 180ms ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color, display: 'inline-flex' }}><PlatformIcon platform={platform} size={14} /></span>
        <span className="micro" style={{ color: 'var(--text-2)' }}>{label}</span>
        {!enabled && <span className="pill" style={{ marginLeft: 'auto', height: 18, fontSize: 10 }}><span className="dot" /> off</span>}
      </div>
      {children}
    </div>
  )
}

function PreviewTikTok({ caption, enabled }: { caption: string; enabled: boolean }) {
  const first = (caption || '').split('\n')[0] || '...'
  return (
    <PreviewCard platform="tiktok" label="TikTok · For You" color="oklch(0.85 0.15 200)" enabled={enabled}>
      <div style={{ display: 'flex', gap: 12 }}>
        <FakeThumb />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, background: 'linear-gradient(135deg, oklch(0.85 0.15 200), oklch(0.70 0.20 340))', padding: 1.5 }}>
              <div style={{ width: '100%', height: '100%', borderRadius: 999, background: 'var(--surface)', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 600 }}>YM</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600 }}>yousefmakes</span>
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>{first}</div>
          <div style={{ display: 'flex', gap: 10, color: 'var(--text-dim)', fontSize: 11 }}>
            <span>♥ 18.4k</span><span>💬 247</span><span>↗ 1.2k</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>est. reach · 4.2K – 18K</div>
        </div>
      </div>
    </PreviewCard>
  )
}

function PreviewInstagram({ caption, enabled }: { caption: string; enabled: boolean }) {
  const first = (caption || '').split('\n')[0] || '...'
  return (
    <PreviewCard platform="instagram" label="Instagram · Reels" color="oklch(0.70 0.20 340)" enabled={enabled}>
      <div style={{ display: 'flex', gap: 12 }}>
        <FakeThumb />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, background: 'conic-gradient(from 130deg, oklch(0.70 0.20 340), oklch(0.75 0.18 60), oklch(0.70 0.20 340))', padding: 1.5 }}>
              <div style={{ width: '100%', height: '100%', borderRadius: 999, background: 'var(--surface)', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 600 }}>YM</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600 }}>yousefmakes</span>
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>
            <span style={{ fontWeight: 500, color: 'var(--text)' }}>yousefmakes </span>{first}
          </div>
          <div style={{ display: 'flex', gap: 10, color: 'var(--text-dim)', fontSize: 11 }}>
            <span>♡ 1.2k</span><span>💬 84</span><span>✈ 312</span>
          </div>
        </div>
      </div>
    </PreviewCard>
  )
}

function PreviewYouTube({ caption, enabled }: { caption: string; enabled: boolean }) {
  const title = (caption || '').split('\n')[0].slice(0, 95) || 'Untitled Short'
  return (
    <PreviewCard platform="youtube" label="YouTube · Shorts" color="oklch(0.68 0.21 25)" enabled={enabled}>
      <div style={{ display: 'flex', gap: 12 }}>
        <FakeThumb />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, background: 'oklch(0.68 0.21 25)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>Y</div>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Yousef Makes</span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{title}</div>
          <div style={{ display: 'flex', gap: 10, color: 'var(--text-dim)', fontSize: 11 }}>
            <span>👍 2.1k</span><span>💬 184</span><span>↗ 412</span>
          </div>
        </div>
      </div>
    </PreviewCard>
  )
}

// ── Platform toggle card ──────────────────────────────────────────────────────
const PLATFORM_META = {
  youtube:   { name: 'YouTube',   color: 'oklch(0.68 0.21 25)',  Logo: LogoYouTube },
  instagram: { name: 'Instagram', color: 'oklch(0.70 0.20 340)', Logo: LogoInstagram },
  tiktok:    { name: 'TikTok',    color: 'oklch(0.85 0.15 200)', Logo: LogoTikTok },
}

function PlatformToggle({ platform, enabled, locked, onToggle, status, detail }: {
  platform: Platform; enabled: boolean; locked: boolean
  onToggle: () => void; status: PostStatus; detail: string
}) {
  const meta = PLATFORM_META[platform]
  return (
    <button
      onClick={onToggle}
      disabled={locked}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 12, borderRadius: 10,
        background: enabled ? 'var(--bg-2)' : 'oklch(0.155 0.012 255 / 0.4)',
        border: `1px solid ${enabled ? 'var(--border-strong)' : 'var(--hairline)'}`,
        opacity: locked ? 0.35 : enabled ? 1 : 0.55,
        textAlign: 'left', transition: 'all 120ms ease',
        cursor: locked ? 'not-allowed' : 'pointer',
      }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: enabled ? `oklch(from ${meta.color} l c h / 0.15)` : 'var(--surface-2)',
        color: enabled ? meta.color : 'var(--text-mute)',
        display: 'grid', placeItems: 'center',
        border: `1px solid ${enabled ? `oklch(from ${meta.color} l c h / 0.4)` : 'var(--hairline)'}`,
      }}>
        <PlatformIcon platform={platform} size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: enabled ? 'var(--text)' : 'var(--text-mute)' }}>{meta.name}</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {locked ? 'unavailable' : detail}
        </div>
      </div>
      {!locked && (
        <div onClick={e => e.stopPropagation()}>
          <Toggle checked={enabled} onChange={() => onToggle()} />
        </div>
      )}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PostPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [videoType, setVideoType] = useState<VideoType>('short')
  const [caption, setCaption] = useState('')
  const [ytCaption, setYtCaption] = useState('')
  const [ytSeparate, setYtSeparate] = useState(false)
  const [hashtags, setHashtags] = useState<string[]>(['#shorts', '#contentstrategy', '#creator'])
  const [newTag, setNewTag] = useState('')
  const [enabled, setEnabled] = useState({ youtube: true, instagram: true, tiktok: true })
  const [privacy, setPrivacy] = useState('public')
  const [ttPrivacy, setTtPrivacy] = useState('PUBLIC_TO_EVERYONE')
  const [statuses, setStatuses] = useState<Record<Platform, PlatStatus>>(initialStatus())
  const [running, setRunning] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [suggestingCaptions, setSuggestingCaptions] = useState(false)
  const [suggestingHashtags, setSuggestingHashtags] = useState(false)
  const [suggestedCaptions, setSuggestedCaptions] = useState<string[]>([])
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([])

  useEffect(() => {
    if (videoType === 'long') {
      setEnabled({ youtube: true, instagram: false, tiktok: false })
      setYtSeparate(true)
    } else {
      setEnabled({ youtube: true, instagram: true, tiktok: true })
    }
  }, [videoType])

  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__uploadRunning = running
    if (!running) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [running])

  function togglePlatform(p: Platform) {
    if (videoType === 'long' && p !== 'youtube') return
    setEnabled(e => ({ ...e, [p]: !e[p] }))
  }

  function setStatus(p: Platform, state: PostStatus, message = '') {
    setStatuses(s => ({ ...s, [p]: { state, message } }))
  }
  function setAllStatus(state: PostStatus, message = '') {
    setStatuses({ youtube: { state, message }, instagram: { state, message }, tiktok: { state, message } })
  }

  type PlatResult = { success: true; url?: string } | { success: false; error: string }

  async function postYouTube(blobUrl: string): Promise<{ url: string | null; result: PlatResult }> {
    if (!file) return { url: null, result: { success: false, error: 'No file' } }
    setStatus('youtube', 'uploading', 'posting to YouTube...')
    const effectiveCaption = ytSeparate ? ytCaption : caption
    const res = await fetch('/api/post/youtube', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blobUrl, title: file.name.replace(/\.[^.]+$/, ''), description: effectiveCaption, privacy, size: file.size, type: file.type || 'video/mp4' }),
    })
    const data = await safeJson(res)
    if (data.error) { setStatus('youtube', 'failed', data.error); return { url: null, result: { success: false, error: data.error } } }
    setStatus('youtube', 'success')
    return { url: data.videoUrl ?? null, result: { success: true, url: data.videoUrl ?? undefined } }
  }

  async function postInstagram(blobUrl: string): Promise<{ url: string | null; result: PlatResult }> {
    if (!file) return { url: null, result: { success: false, error: 'No file' } }
    setStatus('instagram', 'uploading', 'posting to Instagram...')
    const captionWithTags = caption + (hashtags.length ? '\n\n' + hashtags.join(' ') : '')
    const res = await fetch('/api/post/instagram', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: blobUrl, caption: captionWithTags }),
    })
    const data = await safeJson(res)
    if (data.error) { setStatus('instagram', 'failed', data.error); return { url: null, result: { success: false, error: data.error } } }
    setStatus('instagram', 'success')
    return { url: data.postUrl ?? null, result: { success: true, url: data.postUrl ?? undefined } }
  }

  async function postTikTok(blobUrl: string): Promise<{ url: null; result: PlatResult }> {
    if (!file) return { url: null, result: { success: false, error: 'No file' } }
    setStatus('tiktok', 'uploading', 'posting to TikTok...')
    const captionWithTags = caption + (hashtags.length ? '\n\n' + hashtags.join(' ') : '')
    const res = await fetch('/api/post/tiktok', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blobUrl, caption: captionWithTags, privacy: ttPrivacy, size: file.size }),
    })
    const data = await safeJson(res)
    if (data.error) { setStatus('tiktok', 'failed', data.error); return { url: null, result: { success: false, error: data.error } } }
    setStatus('tiktok', 'success')
    return { url: null, result: { success: true } }
  }

  async function suggestCaptions() {
    setSuggestingCaptions(true)
    try {
      const res = await fetch('/api/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'captions', context: caption || undefined }) })
      const data = await res.json()
      if (data.captions) setSuggestedCaptions(data.captions)
    } catch {}
    setSuggestingCaptions(false)
  }

  async function suggestHashtags() {
    setSuggestingHashtags(true)
    try {
      const res = await fetch('/api/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'hashtags', context: caption || undefined }) })
      const data = await res.json()
      if (data.hashtags) setSuggestedHashtags(data.hashtags)
    } catch {}
    setSuggestingHashtags(false)
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
          if (pct >= lastPct + 5 || pct === 100) { lastPct = pct; setAllStatus('uploading', `uploading ${pct}%...`) }
        },
      })
      blobUrl = blob.url
      setAllStatus('uploading', 'sending to platforms...')
    } catch (e) {
      setAllStatus('failed', `Upload failed: ${String(e)}`); setRunning(false); return
    }

    const errResult = (e: unknown, p: Platform): { url: null; result: PlatResult } => {
      setStatus(p, 'failed', String(e)); return { url: null, result: { success: false, error: String(e) } }
    }

    const promises: Promise<{ url: string | null; result: PlatResult } | { url: null; result: PlatResult }>[] = []
    if (enabled.youtube)   promises.push(postYouTube(blobUrl).catch(e => errResult(e, 'youtube')))
    else { setStatus('youtube', 'skipped'); promises.push(Promise.resolve({ url: null, result: { success: false, error: 'skipped' } })) }
    if (enabled.instagram) promises.push(postInstagram(blobUrl).catch(e => errResult(e, 'instagram')))
    else { setStatus('instagram', 'skipped'); promises.push(Promise.resolve({ url: null, result: { success: false, error: 'skipped' } })) }
    if (enabled.tiktok)    promises.push(postTikTok(blobUrl).catch(e => errResult(e, 'tiktok')))
    else { setStatus('tiktok', 'skipped'); promises.push(Promise.resolve({ url: null, result: { success: false, error: 'skipped' } })) }

    const [yt, ig, tt] = await Promise.all(promises)
    const ytUrl = yt.url; const igUrl = ig.url

    fetch('/api/blob/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: blobUrl }) }).catch(() => {})
    fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoName: file.name, results: { youtube: yt.result, instagram: ig.result, tiktok: tt.result } }) }).catch(() => {})

    const platforms: Platform[] = []
    if (ytUrl) platforms.push('youtube')
    if (igUrl) platforms.push('instagram')
    if (platforms.length > 0 || ytUrl || igUrl) {
      await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', entry: { id: crypto.randomUUID(), date: new Date().toISOString(), video_name: file.name, platforms, caption, youtube_url: ytUrl ?? undefined, instagram_url: igUrl ?? undefined } }) }).catch(() => {})
    }
    setRunning(false)
  }

  const captionWithTags = useMemo(() => caption + (hashtags.length ? '\n\n' + hashtags.join(' ') : ''), [caption, hashtags])
  const ytCaptionFull = useMemo(() => (ytSeparate ? ytCaption : caption) + (hashtags.length ? '\n\n' + hashtags.join(' ') : ''), [ytSeparate, ytCaption, caption, hashtags])

  const enabledCount = Object.values(enabled).filter(Boolean).length
  const successCount = Object.values(statuses).filter(s => s.state === 'success').length
  const allPosted = successCount === enabledCount && enabledCount > 0 && Object.values(statuses).some(s => s.state === 'success')

  function addTag(raw: string) {
    let t = raw.trim().replace(/\s+/g, '')
    if (!t) return
    if (!t.startsWith('#')) t = `#${t}`
    setHashtags(prev => prev.includes(t) ? prev : [...prev, t])
    setNewTag('')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type.startsWith('video/')) setFile(f)
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 'var(--gap)' }}>
      {/* ── LEFT: Composer ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="micro" style={{ marginBottom: 4 }}>Compose</div>
            <h1 className="h1">New post</h1>
          </div>
          <span className="pill"><IconClock size={11} /> drafted just now</span>
        </div>

        {/* Video type switch */}
        <div className="card" style={{ padding: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {([
              { id: 'short', label: 'Short-form', sub: 'under 60s · vertical · all platforms', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 7h2" /></svg> },
              { id: 'long',  label: 'Long-form',  sub: '1+ min · horizontal · YouTube',        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M10 10l5 2-5 2z" fill="currentColor" stroke="none" /></svg> },
            ] as { id: VideoType; label: string; sub: string; icon: React.ReactNode }[]).map(t => {
              const active = videoType === t.id
              return (
                <button key={t.id} onClick={() => setVideoType(t.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10,
                  background: active ? 'var(--surface-2)' : 'transparent',
                  border: `1px solid ${active ? 'var(--border-strong)' : 'transparent'}`,
                  textAlign: 'left', transition: 'all 140ms ease', position: 'relative',
                }}>
                  {active && <span style={{ position: 'absolute', left: 8, top: 12, bottom: 12, width: 2, background: 'var(--accent)', borderRadius: 999, boxShadow: '0 0 8px var(--accent-glow)' }} />}
                  <span style={{
                    width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center',
                    background: active ? 'var(--accent-dim)' : 'var(--bg-2)',
                    color: active ? 'var(--accent)' : 'var(--text-dim)',
                    border: `1px solid ${active ? 'oklch(0.80 0.16 80 / 0.4)' : 'var(--hairline)'}`,
                    marginLeft: active ? 6 : 0, transition: 'all 140ms ease',
                  }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: active ? 'var(--text)' : 'var(--text-dim)' }}>{t.label}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 2 }}>{t.sub}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Drop zone */}
        <div className="card" style={{ padding: 'var(--pad-sm)' }}>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileRef.current?.click()}
            style={{
              height: videoType === 'long' ? 140 : 180, borderRadius: 'var(--radius)',
              border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
              background: dragging ? 'var(--accent-dim)' : 'var(--bg-2)',
              transition: 'all 180ms ease', cursor: file ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}
          >
            <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
            {!file ? (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, margin: '0 auto 12px', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', border: '1px solid var(--border)', color: dragging ? 'var(--accent)' : 'var(--text-2)', transition: 'color 120ms ease' }}>
                  <IconUpload size={20} />
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500, marginBottom: 4 }}>Drop video here, or click to browse</div>
                <div className="micro">.mp4 .mov .webm · up to 256MB</div>
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', gap: 16, padding: 16 }}>
                <div style={{ width: 100, height: '100%', borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-dim), var(--surface-3))', display: 'grid', placeItems: 'center', border: '1px solid var(--border)', flexShrink: 0 }}>
                  <IconFilm size={28} style={{ color: 'var(--text-dim)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                  <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500, wordBreak: 'break-all' }}>{file.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB · {file.type || 'video/mp4'}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="pill ok" style={{ height: 20, fontSize: 10 }}><span className="dot" />ready</span>
                    <button className="btn ghost tiny" onClick={e => { e.stopPropagation(); setFile(null) }}>Change</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Caption */}
        <div className="card" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="micro">{videoType === 'long' ? 'Short summary (IG · TT)' : 'Caption'}</span>
            <span className="mono" style={{ fontSize: 10.5, color: caption.length > 2200 ? 'var(--bad)' : 'var(--text-mute)' }}>
              {caption.length}<span style={{ color: 'var(--text-mute)' }}> / 2200</span>
            </span>
          </div>
          <textarea className="textarea" rows={videoType === 'long' ? 3 : 5} placeholder="Write once, post everywhere…" value={caption} onChange={e => setCaption(e.target.value)} style={{ fontSize: 14 }} />

          {/* YT separate toggle */}
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <Toggle checked={ytSeparate || videoType === 'long'} onChange={setYtSeparate} disabled={videoType === 'long'} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <LogoYouTube size={12} /> Use a separate YouTube {videoType === 'long' ? 'description' : 'caption'}
              </span>
              {videoType === 'long' && <span className="pill" style={{ height: 20, fontSize: 10 }}>required</span>}
            </label>
            {(ytSeparate || videoType === 'long') && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--hairline)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="micro" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><LogoYouTube size={12} /> YouTube {videoType === 'long' ? 'description' : 'caption'}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: ytCaption.length > 5000 ? 'var(--bad)' : 'var(--text-mute)' }}>{ytCaption.length} / 5000</span>
                </div>
                <textarea className="textarea" rows={videoType === 'long' ? 7 : 4} placeholder={videoType === 'long' ? 'Long-form description with chapters…' : 'Optional longer YouTube caption…'} value={ytCaption} onChange={e => setYtCaption(e.target.value)} style={{ fontSize: 14 }} />
              </div>
            )}
          </div>

          {/* Hashtags */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="micro">Hashtags</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-mute)' }}>{hashtags.length} tags · appended to caption</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {hashtags.map(tag => (
                <button key={tag} onClick={() => setHashtags(prev => prev.filter(t => t !== tag))} className="mono" style={{ fontSize: 11, padding: '4px 8px 4px 10px', borderRadius: 6, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid oklch(0.80 0.16 80 / 0.3)', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} title="Click to remove">
                  {tag} <IconX size={10} style={{ opacity: 0.6 }} />
                </button>
              ))}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 8px', height: 26, borderRadius: 6, background: 'var(--bg-2)', border: '1px dashed var(--hairline)' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-mute)' }}>#</span>
                <input value={newTag.replace(/^#/, '')} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { addTag(newTag) } }} onBlur={() => addTag(newTag)} placeholder="add" className="mono" style={{ background: 'transparent', border: 0, outline: 0, color: 'var(--text)', fontSize: 11, width: 60 }} />
              </div>
            </div>
          </div>

          {/* Gemini AI suggestions */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-mute)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <IconSparkles size={12} style={{ color: 'var(--accent)' }} /> GEMINI ·
            </span>
            <button className="btn ghost tiny" onClick={suggestCaptions} disabled={suggestingCaptions} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <IconSparkles size={11} />
              {suggestingCaptions ? 'generating…' : 'suggest captions'}
            </button>
            <button className="btn ghost tiny" onClick={suggestHashtags} disabled={suggestingHashtags} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <IconSparkles size={11} />
              {suggestingHashtags ? 'generating…' : 'suggest hashtags'}
            </button>
          </div>

          {/* Suggested captions */}
          {suggestedCaptions.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="micro">Suggested captions — click to use</span>
              {suggestedCaptions.map((c, i) => (
                <button key={i} onClick={() => { setCaption(c); setSuggestedCaptions([]) }} style={{
                  padding: '9px 12px', borderRadius: 8, textAlign: 'left',
                  background: 'var(--bg-2)', border: '1px solid var(--hairline)',
                  fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5,
                  transition: 'background 120ms ease',
                }}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Suggested hashtags */}
          {suggestedHashtags.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="micro">Suggested hashtags — click to add</span>
                <button className="btn ghost tiny" onClick={() => setSuggestedHashtags([])}>dismiss</button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {suggestedHashtags.map(tag => (
                  <button key={tag} onClick={() => { addTag(tag); setSuggestedHashtags(prev => prev.filter(t => t !== tag)) }} className="mono" style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'background 120ms ease' }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Platform toggles */}
        <div className="card" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="micro">Destinations</div>
            {videoType === 'long' && <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>long-form · YouTube only</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <PlatformToggle platform="youtube"   enabled={enabled.youtube}   locked={false}                        onToggle={() => togglePlatform('youtube')}   status={statuses.youtube.state}   detail={`${videoType === 'long' ? 'Video' : 'Shorts'} · ${privacy}`} />
            <PlatformToggle platform="instagram" enabled={enabled.instagram} locked={videoType === 'long'}          onToggle={() => togglePlatform('instagram')} status={statuses.instagram.state} detail="public" />
            <PlatformToggle platform="tiktok"    enabled={enabled.tiktok}    locked={videoType === 'long'}          onToggle={() => togglePlatform('tiktok')}    status={statuses.tiktok.state}    detail={ttPrivacy === 'PUBLIC_TO_EVERYONE' ? 'public' : ttPrivacy === 'FOLLOWER_OF_CREATOR' ? 'followers' : 'only me'} />
          </div>

          {/* Privacy details */}
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--hairline)', opacity: enabled.youtube ? 1 : 0.4 }}>
              <div className="micro" style={{ marginBottom: 8 }}>YouTube</div>
              <PrivacyRadio value={privacy} onChange={setPrivacy} options={['public', 'unlisted', 'private']} />
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--hairline)', opacity: enabled.instagram ? 1 : 0.4 }}>
              <div className="micro" style={{ marginBottom: 8 }}>Instagram</div>
              <div style={{ color: 'var(--text-mute)', fontSize: 12, fontStyle: 'italic', padding: '8px 4px' }}>
                {videoType === 'long' ? 'Long-form not supported.' : 'Reels are always public via API.'}
              </div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--hairline)', opacity: enabled.tiktok ? 1 : 0.4 }}>
              <div className="micro" style={{ marginBottom: 8 }}>TikTok</div>
              {videoType === 'long' ? (
                <div style={{ color: 'var(--text-mute)', fontSize: 12, fontStyle: 'italic', padding: '8px 4px' }}>Long-form not supported.</div>
              ) : (
                <PrivacyRadio value={ttPrivacy} onChange={setTtPrivacy} options={[['PUBLIC_TO_EVERYONE', 'Public'], ['FOLLOWER_OF_CREATOR', 'Followers'], ['SELF_ONLY', 'Only me']]} />
              )}
            </div>
          </div>
        </div>

        {/* Status panel */}
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="micro" style={{ marginBottom: 8 }}>Post status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <StatusDot platform="youtube"   state={statuses.youtube.state}   message={statuses.youtube.message} />
            <StatusDot platform="instagram" state={statuses.instagram.state} message={statuses.instagram.message} />
            <StatusDot platform="tiktok"    state={statuses.tiktok.state}    message={statuses.tiktok.message} />
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="card" style={{ padding: 'var(--pad-sm)', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', bottom: 16, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          {running ? (
            <span className="pill warn"><span className="dot" /> posting · {successCount}/{enabledCount} done</span>
          ) : allPosted ? (
            <span className="pill ok"><span className="dot" /> posted to {enabledCount} platform{enabledCount !== 1 ? 's' : ''}</span>
          ) : (
            <span className="pill"><span className="dot" /> {enabledCount} platform{enabledCount !== 1 ? 's' : ''} selected</span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn ghost" disabled={running}>Save as draft</button>
            <button className="btn ghost" disabled={running}><IconClock size={14} /> Schedule</button>
            <button className="btn primary big" disabled={!file || running || enabledCount === 0} onClick={handlePostAll}>
              {running ? (
                <><span style={{ width: 14, height: 14, borderRadius: 999, border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 700ms linear infinite', display: 'inline-block' }} /> Posting…</>
              ) : (
                <>Post to {enabledCount} <IconArrowRight size={15} /></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Live previews ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="micro">Live preview</div>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>updates as you type</span>
        </div>
        {videoType === 'long' ? (
          <>
            <PreviewYouTube caption={ytCaptionFull} enabled={enabled.youtube} />
            <div className="card" style={{ padding: 14, opacity: 0.5 }}>
              <div className="micro" style={{ marginBottom: 6 }}>Instagram / TikTok</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-mute)', lineHeight: 1.5 }}>Long-form videos can&apos;t post here directly. Trim a 60s teaser to cross-post.</div>
            </div>
          </>
        ) : (
          <>
            <PreviewTikTok    caption={captionWithTags} enabled={enabled.tiktok} />
            <PreviewInstagram caption={captionWithTags} enabled={enabled.instagram} />
            <PreviewYouTube   caption={ytCaptionFull}   enabled={enabled.youtube} />
          </>
        )}
      </div>
    </div>
  )
}
