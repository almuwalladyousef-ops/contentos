'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type AccountSlot = 'personal' | 'business'
interface AccountStatus {
  active: AccountSlot
  personal: { email: string } | null
  business: { email: string } | null
}

const credFields = [
  { section: 'INSTAGRAM', key: 'ig_access_token', label: 'Access Token', hint: 'developers.facebook.com → Graph API Explorer → generate token with instagram_basic + instagram_content_publish scopes' },
  { section: 'INSTAGRAM', key: 'ig_account_id', label: 'Business Account ID', hint: 'Graph API Explorer: GET /me?fields=instagram_business_account' },
  { section: 'GROQ', key: 'groq_api_key', label: 'API Key', hint: 'console.groq.com → API Keys → Create API Key' },
  { section: 'GEMINI', key: 'gemini_api_key', label: 'API Key', hint: 'aistudio.google.com → Get API Key' },
]

const sectionOrder = ['INSTAGRAM', 'GROQ', 'GEMINI']

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [ttTokens, setTtTokens] = useState<{ personal: string; business: string }>({ personal: '', business: '' })
  const [ttNames, setTtNames] = useState<{ personal: string; business: string }>({ personal: '', business: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [disconnecting, setDisconnecting] = useState<AccountSlot | null>(null)
  const [editingSlot, setEditingSlot] = useState<AccountSlot>('personal')
  const [allCreds, setAllCreds] = useState<Record<string, Record<string, string>>>({ personal: {}, business: {} })

  const ttConnected = searchParams.get('tt_connected') === '1'
  const ttError = searchParams.get('tt_error')

  // If this page loaded inside a TikTok auth popup, close it and reload the opener
  useEffect(() => {
    if (ttConnected && typeof window !== 'undefined' && window.opener) {
      window.opener.location.reload()
      window.close()
    }
  }, [ttConnected])

  function handleTtConnect(slot: AccountSlot, isSwitch = false) {
    const url = isSwitch
      ? `/api/auth/tiktok/switch?slot=${slot}`
      : `/api/auth/tiktok/connect?slot=${slot}`
    const popup = window.open(url, 'tiktok-auth', 'width=600,height=700,scrollbars=yes,resizable=yes')
    if (!popup) {
      window.location.href = url
    }
  }

  function loadAllCreds() {
    return fetch('/api/drive/credentials?slot=all')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          const p = data.personal ?? {}
          const b = data.business ?? {}
          setAllCreds({ personal: p, business: b })
          setTtTokens({ personal: p.tt_access_token ?? '', business: b.tt_access_token ?? '' })
          setTtNames({ personal: p.tt_display_name ?? '', business: b.tt_display_name ?? '' })
          return data
        }
      })
  }

  useEffect(() => {
    fetch('/api/auth/status').then(r => r.json()).then(setAccountStatus).catch(() => {})
    loadAllCreds()
  }, [])

  useEffect(() => {
    setValues(allCreds[editingSlot] ?? {})
  }, [editingSlot, allCreds])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/drive/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, slot: editingSlot }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAllCreds(prev => ({ ...prev, [editingSlot]: values }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleTtDisconnect(slot: AccountSlot) {
    setDisconnecting(slot)
    try {
      const existing = await fetch(`/api/drive/credentials?slot=${slot}`).then(r => r.json())
      const { tt_access_token: _, ...rest } = existing
      await fetch('/api/drive/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, slot }),
      })
      setTtTokens(prev => ({ ...prev, [slot]: '' }))
    } catch {
      // ignore
    } finally {
      setDisconnecting(null)
    }
  }

  const sections = sectionOrder.map(s => ({
    name: s,
    fields: credFields.filter(f => f.section === s),
  }))

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-lg mb-8">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-text mb-8">Settings & Credentials</h1>

          {/* Google Accounts Section */}
          <div className="mb-10">
            <div className="text-text-muted text-xs font-bold mb-4 tracking-wider uppercase border-b border-border pb-2">
              Google Accounts
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['personal', 'business'] as AccountSlot[]).map(slot => {
                const acc = accountStatus?.[slot]
                const isActive = accountStatus?.active === slot
                return (
                  <div
                    key={slot}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive ? 'border-primary bg-primary/5' : 'border-border bg-surface2'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold tracking-wider uppercase text-text-muted capitalize">
                        {slot}
                      </span>
                      {isActive && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                    {acc ? (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-green shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-sm text-text truncate">{acc.email}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-border" />
                        <span className="text-sm text-text-muted italic">Not connected</span>
                      </div>
                    )}
                    <a
                      href={`/api/auth/connect?slot=${slot}`}
                      className="block w-full text-center py-2 rounded-lg text-xs font-semibold transition-colors border border-border bg-bg hover:bg-surface2 text-text"
                    >
                      {acc ? 'Reconnect' : 'Connect'}
                    </a>
                  </div>
                )
              })}
            </div>
            <p className="text-text-muted text-xs mt-3 italic">
              All files (videos, analysis) are stored in the Personal account's Drive. Each slot has its own TikTok, Instagram, and YouTube credentials.
            </p>
          </div>

          {/* TikTok Section */}
          <div className="mb-10">
            <div className="text-text-muted text-xs font-bold mb-4 tracking-wider uppercase border-b border-border pb-2">
              TikTok
            </div>
            {ttConnected && (
              <div className="bg-green/10 border border-green/30 text-green px-4 py-3 rounded-lg text-sm mb-4">
                TikTok connected successfully
              </div>
            )}
            {ttError && (
              <div className="bg-red/10 border border-red/30 text-red px-4 py-3 rounded-lg text-sm mb-4">
                TikTok connection failed: {ttError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['personal', 'business'] as AccountSlot[]).map(slot => {
                const connected = !!ttTokens[slot]
                const isActive = accountStatus?.active === slot
                return (
                  <div
                    key={slot}
                    className={`p-4 rounded-xl border transition-all ${
                      connected ? 'border-green/40 bg-green/5' : isActive ? 'border-primary bg-primary/5' : 'border-border bg-surface2'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold tracking-wider uppercase text-text-muted capitalize">
                        {slot}
                      </span>
                      {isActive && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                    {connected ? (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-green shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-sm text-text truncate font-medium">@{ttNames[slot] || 'Connected'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-border" />
                        <span className="text-sm text-text-muted italic">Not connected</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTtConnect(slot, connected)}
                        className="flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-colors border border-border bg-bg hover:bg-surface2 text-text"
                      >
                        {connected ? 'Switch accounts' : 'Connect'}
                      </button>
                      {connected && (
                        <button
                          onClick={() => handleTtDisconnect(slot)}
                          disabled={disconnecting === slot}
                          className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors border border-red/30 bg-red/5 hover:bg-red/10 text-red disabled:opacity-50"
                        >
                          {disconnecting === slot ? '...' : 'Disconnect'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-text-muted text-xs mt-3 italic">
              Each slot connects its own TikTok account independently. To switch accounts, click "Switch accounts" — you'll be taken to TikTok where you can log into a different account.
            </p>
          </div>

          {/* Slot selector for credentials */}
          <div className="flex gap-2 mb-6">
            {(['personal', 'business'] as AccountSlot[]).map(slot => (
              <button
                key={slot}
                onClick={() => setEditingSlot(slot)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all border ${
                  editingSlot === slot
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-surface2 border-border text-text-muted hover:text-text'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>

          {/* Dynamic API Sections */}
          {sections.map(section => (
            <div key={section.name} className="mb-10">
              <div className="text-text-muted text-xs font-bold mb-4 tracking-wider uppercase border-b border-border pb-2">
                {section.name}
              </div>
              <div className="space-y-6">
                {section.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-text text-sm font-semibold mb-2">
                      {field.label}
                    </label>
                    <input
                      type="password"
                      value={values[field.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={`Paste ${field.label.toLowerCase()}...`}
                      autoComplete="off"
                      className="w-full bg-bg border border-border text-text rounded-xl p-3.5 focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-dim font-mono text-sm"
                    />
                    <div className="text-text-muted text-xs mt-2 italic">{field.hint}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {error && (
            <div className="bg-red/10 border border-red/30 text-red px-4 py-3 rounded-lg text-sm mb-8">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-md ${
              saving
                ? 'bg-surface2 text-dim cursor-not-allowed border border-border'
                : saved
                ? 'bg-green/10 text-green border border-green/30'
                : 'bg-primary hover:bg-primary-hover text-white cursor-pointer border border-transparent shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] hover:-translate-y-0.5'
            }`}
          >
            {saving ? 'SAVING...' : saved ? '✓ SAVED SUCCESSFULLY' : 'SAVE CREDENTIALS'}
          </button>
        </div>
      </div>
    </div>
  )
}
