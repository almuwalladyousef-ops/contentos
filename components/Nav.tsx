'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/post', label: 'POST' },
  { href: '/analysis', label: 'ANALYSIS' },
  { href: '/history', label: 'HISTORY' },
  { href: '/settings', label: 'SETTINGS' },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav style={{
      borderBottom: '1px solid #2a2a2a',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: '0',
      background: '#161616',
    }}>
      <span style={{ color: '#555', marginRight: '24px', fontSize: '11px', letterSpacing: '0.1em' }}>
        CONTENTOS
      </span>
      {tabs.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          style={{
            padding: '14px 16px',
            fontSize: '12px',
            letterSpacing: '0.05em',
            color: pathname === tab.href ? '#e0e0e0' : '#555',
            textDecoration: 'none',
            borderBottom: pathname === tab.href ? '2px solid #e0e0e0' : '2px solid transparent',
            transition: 'color 0.1s',
          }}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
