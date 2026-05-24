'use client'

import { PostStatus } from '@/lib/types'

const colors: Record<PostStatus, string> = {
  idle: 'bg-dim',
  uploading: 'bg-yellow animate-pulse shadow-[0_0_8px_var(--color-yellow)]',
  success: 'bg-green shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  failed: 'bg-red shadow-[0_0_8px_rgba(239,68,68,0.4)]',
  skipped: 'bg-dim',
}

const textColors: Record<PostStatus, string> = {
  idle: 'text-text-muted',
  uploading: 'text-yellow',
  success: 'text-green',
  failed: 'text-red',
  skipped: 'text-text-muted',
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
    <div className="flex items-start gap-3 py-2">
      <span className="text-text-muted min-w-[80px] text-xs pt-1 uppercase font-medium tracking-wider">
        {platform}
      </span>
      <span 
        className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 transition-all duration-300 ${colors[state]}`}
      />
      <span 
        className={`text-sm break-words font-medium ${textColors[state]}`}
      >
        {message || labels[state]}
      </span>
    </div>
  )
}
