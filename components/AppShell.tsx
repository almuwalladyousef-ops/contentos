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
  const [isMobile, setIsMobile] = useState(false)
  const [account, setAccount] = useState<AccountStatus | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    function checkMobile() {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setNavOpen(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    // Full reload so all client useEffect data fetches re-run with the new account cookie
    window.location.reload()
  }, [])

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
      style={{ gridTemplateColumns: isMobile ? '1fr' : (navOpen ? '240px 1fr' : '0 1fr') }}
    >
      <Sidebar
        navOpen={navOpen}
        isMobile={isMobile}
        onToggle={() => setNavOpen(v => !v)}
        pathname={pathname}
        account={account}
        onSwitchSlot={switchSlot}
      />

      {/* Backdrop for mobile sidebar */}
      {isMobile && navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'oklch(0 0 0 / 0.55)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      )}

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
          height: isMobile ? 'auto' : '100vh',
          minHeight: isMobile ? '100vh' : undefined,
          overflowY: isMobile ? 'visible' : 'auto',
        }}
      >
        {children}
      </main>
    </div>
  )
}
