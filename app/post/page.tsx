'use client'

import { useRef, useState } from 'react'
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

export default function PostPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [ttPrivacy, setTtPrivacy] = useState('SELF_ONLY')
  const [statuses, setStatuses] = useState<Record<Platform, PlatStatus>>(initialStatus())
  const [running, setRunning] = useState(false)

  function setStatus(platform: Platform, state: PostStatus, message = '') {
    setStatuses(s => ({ ...s, [platform]: { state, message } }))
  }

  async function postYouTube(): Promise<string | null> {
    if (!file) return null
    setStatus('youtube', 'uploading')
    const fd = new FormData()
    fd.append('file', file, file.name)
    fd.append('title', file.name.replace(/\.[^.]+$/, ''))
    fd.append('description', caption)
    fd.append('privacy', privacy)
    const res = await fetch('/api/post/youtube', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.error) { setStatus('youtube', 'failed', data.error); return null }
    setStatus('youtube', 'success')
    return data.videoUrl
  }

  async function postInstagram(): Promise<string | null> {
    if (!file) return null
    setStatus('instagram', 'uploading', 'uploading to Drive...')

    // Upload to Drive temp
    const fd = new FormData()
    fd.append('file', file, file.name)
    const tempRes = await fetch('/api/drive/upload-temp', { method: 'POST', body: fd })
    const tempData = await tempRes.json()
    if (tempData.error) { setStatus('instagram', 'failed', tempData.error); return null }

    setStatus('instagram', 'uploading', 'posting to Instagram...')
    const igRes = await fetch('/api/post/instagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: tempData.publicUrl, caption }),
    })
    const igData = await igRes.json()

    // Clean up temp file regardless of outcome
    if (tempData.fileId) {
      fetch('/api/drive/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: tempData.fileId }),
      }).catch(() => {})
    }

    if (igData.error) { setStatus('instagram', 'failed', igData.error); return null }
    setStatus('instagram', 'success')
    return igData.postUrl
  }

  async function postTikTok(): Promise<string | null> {
    if (!file) return null
    setStatus('tiktok', 'uploading')
    const fd = new FormData()
    fd.append('file', file, file.name)
    fd.append('caption', caption)
    fd.append('privacy', ttPrivacy)
    const res = await fetch('/api/post/tiktok', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.error) { setStatus('tiktok', 'failed', data.error); return null }
    setStatus('tiktok', 'success')
    return null
  }

  async function handlePostAll() {
    if (!file) return
    setRunning(true)
    setStatuses({
      youtube: { state: 'uploading', message: '' },
      instagram: { state: 'uploading', message: '' },
      tiktok: { state: 'uploading', message: '' },
    })

    const [ytUrl, igUrl] = await Promise.all([
      postYouTube().catch(e => { setStatus('youtube', 'failed', String(e)); return null }),
      postInstagram().catch(e => { setStatus('instagram', 'failed', String(e)); return null }),
      postTikTok().catch(e => { setStatus('tiktok', 'failed', String(e)); return null }),
    ])

    const platforms: ('youtube' | 'instagram' | 'tiktok')[] = []
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
          
          {/* File Upload Section */}
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

          {/* Caption Section */}
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

          {/* Privacy Settings Section */}
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

          {/* Action Button */}
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

        {/* Status Section */}
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
