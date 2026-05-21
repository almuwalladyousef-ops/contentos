'use client'

import { useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
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
  const { data: session } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [privacy, setPrivacy] = useState('unlisted')
  const [ttPrivacy, setTtPrivacy] = useState('SELF_ONLY')
  const [statuses, setStatuses] = useState<Record<Platform, PlatStatus>>(initialStatus())
  const [running, setRunning] = useState(false)

  if (!session) return null

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
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#e0e0e0', padding: '8px 14px', fontSize: '12px' }}
        >
          [BROWSE]
        </button>
        <span style={{ color: file ? '#e0e0e0' : '#555', fontSize: '12px' }}>
          {file ? file.name : 'no file selected'}
        </span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', color: '#555', fontSize: '11px', marginBottom: '6px', letterSpacing: '0.1em' }}>
          CAPTION
        </label>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          rows={4}
          placeholder="caption for Instagram + TikTok / description for YouTube"
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '32px' }}>
        <div>
          <div style={{ color: '#555', fontSize: '11px', marginBottom: '8px', letterSpacing: '0.1em' }}>YOUTUBE PRIVACY</div>
          {['unlisted', 'public', 'private'].map(p => (
            <label key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginRight: '16px', cursor: 'pointer', fontSize: '12px', color: privacy === p ? '#e0e0e0' : '#555' }}>
              <input type="radio" name="yt-privacy" value={p} checked={privacy === p} onChange={() => setPrivacy(p)} style={{ width: 'auto' }} />
              {p}
            </label>
          ))}
        </div>
        <div>
          <div style={{ color: '#555', fontSize: '11px', marginBottom: '8px', letterSpacing: '0.1em' }}>TIKTOK PRIVACY</div>
          {[['SELF_ONLY', 'only me'], ['FOLLOWER_OF_CREATOR', 'followers'], ['PUBLIC_TO_EVERYONE', 'public']].map(([val, label]) => (
            <label key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginRight: '16px', cursor: 'pointer', fontSize: '12px', color: ttPrivacy === val ? '#e0e0e0' : '#555' }}>
              <input type="radio" name="tt-privacy" value={val} checked={ttPrivacy === val} onChange={() => setTtPrivacy(val)} style={{ width: 'auto' }} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handlePostAll}
        disabled={!file || running}
        style={{
          background: '#1e1e1e',
          border: '1px solid #2a2a2a',
          color: (!file || running) ? '#555' : '#e0e0e0',
          padding: '10px 20px',
          fontSize: '12px',
          letterSpacing: '0.05em',
          cursor: (!file || running) ? 'not-allowed' : 'pointer',
          marginBottom: '28px',
        }}
      >
        {running ? 'POSTING...' : '[POST TO ALL]'}
      </button>

      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '20px' }}>
        <div style={{ color: '#555', fontSize: '11px', marginBottom: '12px', letterSpacing: '0.1em' }}>STATUS</div>
        <StatusDot platform="youtube" state={statuses.youtube.state} message={statuses.youtube.message} />
        <StatusDot platform="instagram" state={statuses.instagram.state} message={statuses.instagram.message} />
        <StatusDot platform="tiktok" state={statuses.tiktok.state} message={statuses.tiktok.message} />
      </div>
    </div>
  )
}
