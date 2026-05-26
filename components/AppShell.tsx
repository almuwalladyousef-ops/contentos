'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import { IconSidebar } from './Icons'

type AccountSlot = 'personal' | 'business'
interface AccountStatus {
  active: AccountSlot
  personal: { email: string } | null
  business: { email: string } | null
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(true)
  const [account, setAccount] = useState<AccountStatus | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(setAccount)
      .catch(() => {})
  }, [])

  const switchSlot = useCallback(async (slot: AccountSlot) => {
    await fetch('/api/auth/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot }),
    }).catch(() => {})
    setAccount(a => (a ? { ...a, active: slot } : a))
    router.refresh()
  }, [router])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key === 'b') { e.preventDefault(); setNavOpen(v => !v) }
      if (isMod && e.key === '1') { e.preventDefault(); router.push('/post') }
      if (isMod && e.key === '2') { e.preventDefault(); router.push('/analysis') }
      if (isMod && e.key === '3') { e.preventDefault(); router.push('/history') }
      if (isMod && e.key === ',') { e.preventDefault(); router.push('/settings') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  return (
    <div
      className="app"
      style={{ gridTemplateColumns: navOpen ? '240px 1fr' : '0 1fr' }}
    >
      <Sidebar
        navOpen={navOpen}
        onToggle={() => setNavOpen(v => !v)}
        pathname={pathname}
        account={account}
        onSwitchSlot={switchSlot}
      />

      <button
        className={`nav-reopen${!navOpen ? ' visible' : ''}`}
        onClick={() => setNavOpen(true)}
        title="Open sidebar (⌘B)"
        aria-label="Open sidebar"
      >
        <IconSidebar size={17} />
      </button>

      <main
        className="scroll"
        style={{
          padding: 'var(--pad)',
          position: 'relative',
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {children}
      </main>
    </div>
  )
}
