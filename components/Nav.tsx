'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type AccountSlot = 'personal' | 'business'
interface AccountStatus {
  active: AccountSlot
  personal: { email: string } | null
  business: { email: string } | null
}

const tabs = [
  { href: '/post', label: 'Post' },
  { href: '/analysis', label: 'Analysis' },
  { href: '/history', label: 'History' },
  { href: '/settings', label: 'Settings' },
]

export default function Nav() {
  const pathname = usePathname()
  const [status, setStatus] = useState<AccountStatus | null>(null)

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
  }, [])

  async function switchSlot(slot: AccountSlot) {
    await fetch('/api/auth/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot }),
    })
    setStatus(s => s ? { ...s, active: slot } : s)
  }

  const activeAccount = status ? status[status.active] : null

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-bg/80 border-b border-border shadow-sm px-4 sm:px-6 lg:px-8 flex items-center h-16">
      <div className="flex items-center gap-8 w-full max-w-7xl mx-auto">
        <span className="font-bold text-xl tracking-tight text-primary flex-shrink-0">
          Content<span className="text-text">OS</span>
        </span>

        <div className="flex space-x-1 sm:space-x-4">
          {tabs.map(tab => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out ${
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-text-muted hover:bg-surface2 hover:text-text'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {status ? (
            <>
              {/* Personal / Business toggle */}
              <div className="flex items-center bg-surface2 rounded-lg border border-border p-0.5 gap-0.5">
                {(['personal', 'business'] as AccountSlot[]).map(slot => {
                  const acc = status[slot]
                  const isActive = status.active === slot
                  return (
                    <button
                      key={slot}
                      onClick={() => acc && switchSlot(slot)}
                      title={acc ? acc.email : `No ${slot} account — connect in Settings`}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all capitalize ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : acc
                          ? 'text-text-muted hover:text-text hover:bg-border'
                          : 'text-dim cursor-not-allowed'
                      }`}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>

              {/* Active account email */}
              {activeAccount ? (
                <span className="text-xs text-text-muted hidden sm:block truncate max-w-[160px]">
                  {activeAccount.email}
                </span>
              ) : (
                <Link href="/settings" className="text-xs text-primary hover:underline">
                  Connect account
                </Link>
              )}
            </>
          ) : null}
        </div>
      </div>
    </nav>
  )
}
