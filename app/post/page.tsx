'use client'

import { useRef, useState, useEffect } from 'react'
import { upload } from '@vercel/blob/client'
import StatusDot from '@/components/StatusDot'
import { PostStatus } from '@/lib/types'

type Platform = 'youtube' | 'instagram' | 'tiktok'

interface PlatStatus {
  state: PostStatus
  message: string
}

const initialStatus = (): Record<Platform, PlatStatus> => ({
  youtube: { state: 'idle', message: '' },
  instagram: { state: 'idle', message: '' },
  tiktok: { state: 'idle', message: '' },
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
      youtube: { state, message },
      instagram: { state, message },
      tiktok: { state, message },
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

    // Step 1: Upload once to Vercel Blob
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

    // Step 2: Post to all platforms in parallel using the blob URL
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

    // Step 3: Delete blob
    fetch('/api/blob/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: blobUrl }),
    }).catch(() => {})

    // Send email notification with per-platform results
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

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-lg mb-8">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-text mb-6">Create New Post</h1>

          <div className="mb-8">
            <div className="flex items-center gap-4">
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="bg-surface2 hover:bg-border text-text font-medium py-2.5 px-5 rounded-lg border border-border transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
              >
                Browse Video
              </button>
              <span className={`text-sm truncate ${file ? 'text-text' : 'text-text-muted italic'}`}>
                {file ? file.name : 'No file selected'}
              </span>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-text-muted text-xs font-semibold mb-2 tracking-wider uppercase">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={4}
              placeholder="Caption for Instagram + TikTok / Description for YouTube..."
              className="w-full bg-bg border border-border text-text rounded-xl p-4 focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-dim resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            <div className="bg-bg/50 p-4 rounded-xl border border-border/50">
              <div className="text-text-muted text-xs font-semibold mb-3 tracking-wider uppercase">YouTube Privacy</div>
              <div className="flex flex-col gap-2.5">
                {['unlisted', 'public', 'private'].map(p => (
                  <label key={p} className="inline-flex items-center group cursor-pointer">
                    <input
                      type="radio"
                      name="yt-privacy"
                      value={p}
                      checked={privacy === p}
                      onChange={() => setPrivacy(p)}
                      className="w-4 h-4 text-primary bg-surface border-border focus:ring-primary focus:ring-offset-bg transition-colors"
                    />
                    <span className={`ml-3 text-sm capitalize transition-colors ${privacy === p ? 'text-text font-medium' : 'text-text-muted group-hover:text-text'}`}>
                      {p}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-bg/50 p-4 rounded-xl border border-border/50">
              <div className="text-text-muted text-xs font-semibold mb-3 tracking-wider uppercase">Instagram Privacy</div>
              <div className="flex flex-col gap-2.5">
                <label className="inline-flex items-center">
                  <input type="radio" name="ig-privacy" checked readOnly className="w-4 h-4 text-primary bg-surface border-border" />
                  <span className="ml-3 text-sm text-text font-medium">Public</span>
                </label>
                <p className="text-xs text-text-muted italic">Instagram Reels are always public via API</p>
              </div>
            </div>

            <div className="bg-bg/50 p-4 rounded-xl border border-border/50">
              <div className="text-text-muted text-xs font-semibold mb-3 tracking-wider uppercase">TikTok Privacy</div>
              <div className="flex flex-col gap-2.5">
                {[['SELF_ONLY', 'Only me'], ['FOLLOWER_OF_CREATOR', 'Followers'], ['PUBLIC_TO_EVERYONE', 'Public']].map(([val, label]) => (
                  <label key={val} className="inline-flex items-center group cursor-pointer">
                    <input
                      type="radio"
                      name="tt-privacy"
                      value={val}
                      checked={ttPrivacy === val}
                      onChange={() => setTtPrivacy(val)}
                      className="w-4 h-4 text-primary bg-surface border-border focus:ring-primary focus:ring-offset-bg transition-colors"
                    />
                    <span className={`ml-3 text-sm transition-colors ${ttPrivacy === val ? 'text-text font-medium' : 'text-text-muted group-hover:text-text'}`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handlePostAll}
            disabled={!file || running}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-md ${
              (!file || running)
                ? 'bg-surface2 text-dim cursor-not-allowed border border-border'
                : 'bg-primary hover:bg-primary-hover text-white cursor-pointer border border-transparent shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] hover:-translate-y-0.5'
            }`}
          >
            {running ? 'POSTING IN PROGRESS...' : 'POST TO ALL PLATFORMS'}
          </button>
        </div>

        <div className="bg-surface2 px-6 sm:px-8 py-5 border-t border-border">
          <div className="text-text-muted text-xs font-semibold mb-4 tracking-wider uppercase flex items-center justify-between">
            <span>Status</span>
            {running && <span className="text-primary animate-pulse text-[10px]">Active</span>}
          </div>
          <div className="space-y-1">
            <StatusDot platform="youtube" state={statuses.youtube.state} message={statuses.youtube.message} />
            <StatusDot platform="instagram" state={statuses.instagram.state} message={statuses.instagram.message} />
            <StatusDot platform="tiktok" state={statuses.tiktok.state} message={statuses.tiktok.message} />
          </div>
        </div>
      </div>
    </div>
  )
}
