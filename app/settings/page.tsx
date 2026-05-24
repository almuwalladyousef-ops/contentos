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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const ttConnected = searchParams.get('tt_connected') === '1'
  const ttError = searchParams.get('tt_error')

  useEffect(() => {
    fetch('/api/auth/status').then(r => r.json()).then(setAccountStatus).catch(() => {})
    fetch('/api/drive/credentials')
      .then(r => r.json())
      .then(data => { if (data && !data.error) setValues(data) })
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/drive/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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
              All files (videos, analysis) are stored in the Personal account's Drive. Each slot has its own TikTok, Instagram, and YouTube credentials. Switch slots to manage each account's settings.
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
            <div className={`p-4 rounded-xl border transition-all ${values.tt_access_token ? 'border-green/40 bg-green/5' : 'border-border bg-surface2'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${values.tt_access_token ? 'bg-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-border'}`} />
                <span className="text-sm text-text">
                  {values.tt_access_token ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <a
                href={`/api/auth/tiktok/connect?slot=${accountStatus?.active ?? 'personal'}`}
                className="block w-full text-center py-2 rounded-lg text-xs font-semibold transition-colors border border-border bg-bg hover:bg-surface2 text-text"
              >
                {values.tt_access_token ? 'Reconnect TikTok' : 'Connect TikTok'}
              </a>
            </div>
            <p className="text-text-muted text-xs mt-2 italic">
              Connects the active account slot's TikTok. Switch slots before connecting to link a different TikTok account.
            </p>
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
