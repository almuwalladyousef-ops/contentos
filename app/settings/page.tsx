'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type AccountSlot = 'personal' | 'business'
interface AccountStatus {
  active: AccountSlot
  personal: { email: string } | null
  business: { email: string } | null
}

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
  const [slot, setSlot] = useState<AccountSlot>('personal')
  const [allCreds, setAllCreds] = useState<Record<AccountSlot, Record<string, string>>>({ personal: {}, business: {} })
  const [ttTokens, setTtTokens] = useState<Record<AccountSlot, string>>({ personal: '', business: '' })
  const [ttNames, setTtNames] = useState<Record<AccountSlot, string>>({ personal: '', business: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [disconnecting, setDisconnecting] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)

  const ttConnected = searchParams.get('tt_connected') === '1'
  const ttError = searchParams.get('tt_error')

  useEffect(() => {
    if (ttConnected && typeof window !== 'undefined' && window.opener) {
      window.opener.location.reload()
      window.close()
    }
  }, [ttConnected])

  useEffect(() => {
    fetch('/api/auth/status').then(r => r.json()).then(setAccountStatus).catch(() => {})
    fetch('/api/drive/credentials?slot=all')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          const p = data.personal ?? {}
          const b = data.business ?? {}
          setAllCreds({ personal: p, business: b })
          setTtTokens({ personal: p.tt_access_token ?? '', business: b.tt_access_token ?? '' })
          setTtNames({ personal: p.tt_display_name ?? '', business: b.tt_display_name ?? '' })
        }
      })
  }, [])

  const creds = allCreds[slot]

  function setCred(key: string, val: string) {
    setAllCreds(prev => ({ ...prev, [slot]: { ...prev[slot], [key]: val } }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/drive/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...creds, slot }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  function handleTtConnect() {
    const connected = !!ttTokens[slot]
    const url = connected ? `/api/auth/tiktok/switch?slot=${slot}` : `/api/auth/tiktok/connect?slot=${slot}`
    const popup = window.open(url, 'tiktok-auth', 'width=600,height=700,scrollbars=yes,resizable=yes')
    if (!popup) window.location.href = url
  }

  async function handleTtDisconnect() {
    setDisconnecting(true)
    try {
      const { tt_access_token: _, ...rest } = creds
      await fetch('/api/drive/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, slot }),
      })
      setAllCreds(prev => ({ ...prev, [slot]: { ...prev[slot], tt_access_token: '' } }))
      setTtTokens(prev => ({ ...prev, [slot]: '' }))
    } catch { /* ignore */ } finally {
      setDisconnecting(false)
    }
  }

  const acc = accountStatus?.[slot]
  const ttConnectedSlot = !!ttTokens[slot]

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-lg mb-8">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-text">Settings</h1>
            <button
              onClick={() => setShowSecrets(s => !s)}
              className="text-xs font-semibold text-text-muted hover:text-text border border-border rounded-lg px-3 py-1.5 transition-colors"
            >
              {showSecrets ? 'Hide' : 'Show'} keys
            </button>
          </div>

          {/* Slot Toggle */}
          <div className="flex gap-2 p-1 bg-surface2 rounded-xl border border-border mb-8">
            {(['personal', 'business'] as AccountSlot[]).map(s => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold tracking-wide capitalize transition-all ${
                  slot === s
                    ? 'bg-primary text-white shadow-md'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {ttConnected && (
            <div className="bg-green/10 border border-green/30 text-green px-4 py-3 rounded-lg text-sm mb-6">
              TikTok connected successfully
            </div>
          )}
          {ttError && (
            <div className="bg-red/10 border border-red/30 text-red px-4 py-3 rounded-lg text-sm mb-6">
              TikTok connection failed: {ttError}
            </div>
          )}

          <div className="space-y-6">
            {/* Google */}
            <div className="p-4 rounded-xl border border-border bg-bg/50">
              <div className="text-text-muted text-xs font-bold mb-3 tracking-wider uppercase">Google Account</div>
              {acc ? (
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-sm text-text truncate">{acc.email}</span>
                  {accountStatus?.active === slot && (
                    <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">Active</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-border" />
                  <span className="text-sm text-text-muted italic">Not connected</span>
                </div>
              )}
              <a
                href={`/api/auth/connect?slot=${slot}`}
                className="block w-full text-center py-2 rounded-lg text-xs font-semibold border border-border bg-surface hover:bg-surface2 text-text transition-colors"
              >
                {acc ? 'Reconnect' : 'Connect'}
              </a>
            </div>

            {/* TikTok */}
            <div className="p-4 rounded-xl border border-border bg-bg/50">
              <div className="text-text-muted text-xs font-bold mb-3 tracking-wider uppercase">TikTok</div>
              {ttConnectedSlot ? (
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-sm text-text font-medium">@{ttNames[slot] || 'Connected'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-border" />
                  <span className="text-sm text-text-muted italic">Not connected</span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleTtConnect}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-border bg-surface hover:bg-surface2 text-text transition-colors"
                >
                  {ttConnectedSlot ? 'Switch accounts' : 'Connect'}
                </button>
                {ttConnectedSlot && (
                  <button
                    onClick={handleTtDisconnect}
                    disabled={disconnecting}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-red/30 bg-red/5 hover:bg-red/10 text-red transition-colors disabled:opacity-50"
                  >
                    {disconnecting ? '...' : 'Disconnect'}
                  </button>
                )}
              </div>
            </div>

            {/* Instagram */}
            <div className="p-4 rounded-xl border border-border bg-bg/50">
              <div className="text-text-muted text-xs font-bold mb-4 tracking-wider uppercase">Instagram</div>
              <div className="space-y-4">
                <div>
                  <label className="block text-text text-sm font-semibold mb-2">Access Token</label>
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={creds.ig_access_token ?? ''}
                    onChange={e => setCred('ig_access_token', e.target.value)}
                    placeholder="Paste access token..."
                    autoComplete="off"
                    className="w-full bg-bg border border-border text-text rounded-xl p-3.5 focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-dim font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-text text-sm font-semibold mb-2">Business Account ID</label>
                  <input
                    type="text"
                    value={creds.ig_account_id ?? ''}
                    onChange={e => setCred('ig_account_id', e.target.value)}
                    placeholder="e.g. 17841465850620700"
                    autoComplete="off"
                    className="w-full bg-bg border border-border text-text rounded-xl p-3.5 focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-dim font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Groq */}
            <div className="p-4 rounded-xl border border-border bg-bg/50">
              <div className="text-text-muted text-xs font-bold mb-4 tracking-wider uppercase">Groq</div>
              <label className="block text-text text-sm font-semibold mb-2">API Key</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={creds.groq_api_key ?? ''}
                onChange={e => setCred('groq_api_key', e.target.value)}
                placeholder="Paste API key..."
                autoComplete="off"
                className="w-full bg-bg border border-border text-text rounded-xl p-3.5 focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-dim font-mono text-sm"
              />
              <div className="text-text-muted text-xs mt-2 italic">console.groq.com → API Keys</div>
            </div>

            {/* Gemini */}
            <div className="p-4 rounded-xl border border-border bg-bg/50">
              <div className="text-text-muted text-xs font-bold mb-4 tracking-wider uppercase">Gemini</div>
              <label className="block text-text text-sm font-semibold mb-2">API Key</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={creds.gemini_api_key ?? ''}
                onChange={e => setCred('gemini_api_key', e.target.value)}
                placeholder="Paste API key..."
                autoComplete="off"
                className="w-full bg-bg border border-border text-text rounded-xl p-3.5 focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-dim font-mono text-sm"
              />
              <div className="text-text-muted text-xs mt-2 italic">aistudio.google.com → Get API Key</div>
            </div>
          </div>

          {error && (
            <div className="bg-red/10 border border-red/30 text-red px-4 py-3 rounded-lg text-sm mt-6">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full mt-6 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-md ${
              saving
                ? 'bg-surface2 text-dim cursor-not-allowed border border-border'
                : saved
                ? 'bg-green/10 text-green border border-green/30'
                : 'bg-primary hover:bg-primary-hover text-white cursor-pointer border border-transparent shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] hover:-translate-y-0.5'
            }`}
          >
            {saving ? 'SAVING...' : saved ? '✓ SAVED' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  )
}
