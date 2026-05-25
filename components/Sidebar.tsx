'use client'

import Link from 'next/link'
import {
  IconPost,
  IconAnalysis,
  IconHistory,
  IconSettings,
  IconSidebar,
  IconCommand,
} from './Icons'

type AccountSlot = 'personal' | 'business'
interface AccountStatus {
  active: AccountSlot
  personal: { email: string } | null
  business: { email: string } | null
}

interface SidebarProps {
  navOpen: boolean
  onToggle: () => void
  pathname: string
  account: AccountStatus | null
  onSwitchSlot: (slot: AccountSlot) => void
}

const NAV_ITEMS = [
  { href: '/post',     label: 'Post',     Icon: IconPost,     shortcut: '⌘1' },
  { href: '/analysis', label: 'Analysis', Icon: IconAnalysis, shortcut: '⌘2' },
  { href: '/history',  label: 'History',  Icon: IconHistory,  shortcut: '⌘3' },
  { href: '/settings', label: 'Settings', Icon: IconSettings, shortcut: '⌘,' },
]

export default function Sidebar({ navOpen, onToggle, pathname, account, onSwitchSlot }: SidebarProps) {
  const slot = account?.active ?? 'personal'
  const acc = account ? account[slot] : null
  const initials = acc?.email
    ? acc.email.slice(0, 2).toUpperCase()
    : 'YO'

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '20px 14px',
        borderRight: '1px solid var(--border)',
        background: 'oklch(0.155 0.012 255 / 0.5)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        opacity: navOpen ? 1 : 0,
        transition: 'opacity 180ms ease',
        pointerEvents: navOpen ? 'auto' : 'none',
      }}
    >
      {/* Logo row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 10px' }}>
        <Logo />
        <button
          onClick={onToggle}
          title="Close sidebar (⌘B)"
          style={{
            width: 26, height: 26,
            display: 'grid', placeItems: 'center',
            borderRadius: 7,
            border: '1px solid transparent',
            color: 'var(--text-mute)',
            transition: 'all 120ms ease',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'var(--surface-2)'
            el.style.color = 'var(--text)'
            el.style.borderColor = 'var(--hairline)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'transparent'
            el.style.color = 'var(--text-mute)'
            el.style.borderColor = 'transparent'
          }}
        >
          <IconSidebar size={15} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ href, label, Icon, shortcut }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 9,
                color: active ? 'var(--text)' : 'var(--text-dim)',
                background: active ? 'var(--surface-2)' : 'transparent',
                border: `1px solid ${active ? 'var(--border)' : 'transparent'}`,
                position: 'relative',
                transition: 'all 120ms ease',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'oklch(0.215 0.014 255 / 0.5)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
              }}
            >
              {/* Left accent bar for active item */}
              {active && (
                <span style={{
                  position: 'absolute',
                  left: -14,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  background: 'var(--accent)',
                  borderRadius: 999,
                  boxShadow: '0 0 8px var(--accent-glow)',
                }} />
              )}
              <Icon size={17} />
              <span style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>{label}</span>
              <span
                className="mono"
                style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-mute)' }}
              >
                {shortcut}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom slot */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* ⌘K tip */}
        <div style={{
          padding: 10,
          borderRadius: 10,
          background: 'var(--bg-2)',
          border: '1px solid var(--hairline)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: 'var(--text-dim)',
        }}>
          <IconCommand size={14} />
          <span>Press</span>
          <kbd
            className="mono"
            style={{
              padding: '1px 6px',
              borderRadius: 4,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              fontSize: 10,
              color: 'var(--text-2)',
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Account switcher */}
        <div style={{
          padding: 8,
          borderRadius: 10,
          background: 'var(--bg-2)',
          border: '1px solid var(--hairline)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <div style={{
              width: 30, height: 30,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), oklch(0.62 0.16 280))',
              display: 'grid', placeItems: 'center',
              fontSize: 11, fontWeight: 600,
              color: 'oklch(0.18 0.013 255)',
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {acc?.email ?? 'Not connected'}
              </div>
              <div
                className="mono"
                style={{ fontSize: 9.5, color: 'var(--text-mute)', marginTop: 2 }}
              >
                {slot}
              </div>
            </div>
          </div>

          {/* Personal / Business pills */}
          <div style={{
            display: 'flex',
            padding: 2,
            borderRadius: 7,
            background: 'var(--surface)',
            border: '1px solid var(--hairline)',
          }}>
            {(['personal', 'business'] as AccountSlot[]).map(s => (
              <button
                key={s}
                onClick={() => onSwitchSlot(s)}
                style={{
                  flex: 1,
                  padding: '4px 0',
                  borderRadius: 5,
                  fontSize: 10.5,
                  textTransform: 'capitalize',
                  color: slot === s ? 'var(--text)' : 'var(--text-mute)',
                  background: slot === s ? 'var(--surface-3)' : 'transparent',
                  fontWeight: slot === s ? 600 : 400,
                  transition: 'all 120ms ease',
                  letterSpacing: '0.02em',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 26, height: 26,
        borderRadius: 7,
        background: 'linear-gradient(135deg, var(--accent), oklch(0.65 0.18 280))',
        display: 'grid', placeItems: 'center',
        boxShadow: '0 4px 14px var(--accent-glow), 0 1px 0 oklch(1 0 0 / 0.2) inset',
        flexShrink: 0,
      }}>
        <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'oklch(0.18 0.013 255)' }}>C</span>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1 }}>ContentOS</div>
        <div
          className="mono"
          style={{ fontSize: 9.5, color: 'var(--text-mute)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}
        >
          v0.2 · preview
        </div>
      </div>
    </div>
  )
}
