'use client'

import { PostStatus } from '@/lib/types'

const colors: Record<PostStatus, string> = {
  idle: '#555555',
  uploading: '#eab308',
  success: '#22c55e',
  failed: '#ef4444',
  skipped: '#555555',
}

const labels: Record<PostStatus, string> = {
  idle: 'waiting',
  uploading: 'uploading...',
  success: 'posted',
  failed: 'failed',
  skipped: 'skipped',
}

interface Props {
  platform: string
  state: PostStatus
  message?: string
}

export default function StatusDot({ platform, state, message }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '6px 0' }}>
      <span style={{ color: '#555', minWidth: '80px', fontSize: '12px', paddingTop: '1px' }}>
        {platform.toUpperCase()}
      </span>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: colors[state],
        flexShrink: 0,
        marginTop: '4px',
        boxShadow: state === 'uploading' ? `0 0 6px ${colors[state]}` : 'none',
      }} />
      <span style={{
        color: state === 'failed' ? '#ef4444' : state === 'success' ? '#22c55e' : '#555',
        fontSize: '12px',
        wordBreak: 'break-word',
      }}>
        {message || labels[state]}
      </span>
    </div>
  )
}
