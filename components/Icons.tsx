import React from 'react'

interface IconProps {
  size?: number
  style?: React.CSSProperties
  className?: string
}

function Icon({ children, size = 18, style, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={style}
      className={className}
    >
      {children}
    </svg>
  )
}

export const IconPost = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 4l14 8-14 8V4z" />
  </Icon>
)

export const IconAnalysis = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="14" width="4" height="8" rx="1" />
    <rect x="10" y="10" width="4" height="12" rx="1" />
    <rect x="16" y="6" width="4" height="16" rx="1" />
  </Icon>
)

export const IconHistory = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <rect x="11" y="7" width="2" height="6" rx="1" />
    <rect x="11" y="11" width="5" height="2" rx="1" />
  </Icon>
)

export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="5" />
    <rect x="10" y="3" width="4" height="3" rx="1" />
    <rect x="10" y="18" width="4" height="3" rx="1" />
    <rect x="3" y="10" width="3" height="4" rx="1" />
    <rect x="18" y="10" width="3" height="4" rx="1" />
  </Icon>
)

export const IconSidebar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="5" height="16" rx="1" />
    <rect x="10" y="4" width="11" height="16" rx="1" />
  </Icon>
)

export const IconCommand = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 6l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
  </Icon>
)

export const IconUpload = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="18" width="16" height="3" rx="1" />
    <path d="M12 4l5 5h-3v7h-4V9H7z" />
  </Icon>
)

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12l5 5L20 6l-2-2-9 9-3-3z" />
  </Icon>
)

export const IconX = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 5l4-4 12 12-4 4z" />
    <path d="M19 5l-4-4-12 12 4 4z" />
  </Icon>
)

export const IconArrowUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4l-8 8h5v8h6v-8h5z" />
  </Icon>
)

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12l-8-8v5H4v6h8v5z" />
  </Icon>
)

export const IconSparkles = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2l2.7 5.5 6.3.9-4.6 4.5 1.1 6.1L12 16.5l-5.5 2.5L7.6 13 3 8.4l6.3-.9z" />
  </Icon>
)

export const IconBolt = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 4L6 13h6l-1 7 7-9h-6z" />
  </Icon>
)

export const IconEye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M1 12c0 0 4-8 11-8s11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6" fill-rule="evenodd" />
  </Icon>
)

export const IconClipboard = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <rect x="6" y="5" width="12" height="17" rx="2" />
    <rect x="9" y="10" width="6" height="2" rx="0.5" />
    <rect x="9" y="14" width="6" height="2" rx="0.5" />
  </Icon>
)

export const IconKey = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="15" r="5" />
    <rect x="12" y="13" width="8" height="4" rx="1" />
    <rect x="17" y="10" width="3" height="6" rx="1" />
  </Icon>
)

export const IconShield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2L5 5v7c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V5z" />
  </Icon>
)

export const IconExternal = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 7h10v10M7 17L17 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
)

export const IconFilm = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M6 6h2v4H6z M6 12h2v4H6z M6 18h2v2H6z" />
    <path d="M16 6h2v4h-2z M16 12h2v4h-2z M16 18h2v2h-2z" />
  </Icon>
)

export const IconLink = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 6h10a4 4 0 0 1 0 8h-4M16 18H6a4 4 0 0 1 0-8h4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
)

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <rect x="11" y="7" width="2" height="6" rx="1" />
    <rect x="11" y="11" width="5" height="2" rx="1" />
  </Icon>
)

export const IconRefresh = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
)

export const LogoYouTube = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="2" y="6" width="20" height="12" rx="3" />
    <path d="M10 9.5v5l5-2.5-5-2.5z" fill="oklch(0.215 0.014 255)" />
  </svg>
)

export const LogoInstagram = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <rect x="6" y="6" width="12" height="12" rx="3" fill="none" stroke="oklch(0.215 0.014 255)" strokeWidth="1.5" />
    <circle cx="17" cy="7" r="1.5" fill="oklch(0.215 0.014 255)" />
  </svg>
)

export const LogoTikTok = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
    <path d="M14 3c0 2.5 2 4.5 4.5 4.5" />
  </svg>
)

export function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  if (platform === 'youtube') return <LogoYouTube size={size} />
  if (platform === 'instagram') return <LogoInstagram size={size} />
  if (platform === 'tiktok') return <LogoTikTok size={size} />
  return null
}
