'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { IconKey, IconShield } from '@/components/Icons'

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

function SectionCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {icon && <span style={{ color: 'var(--text-mute)' }}>{icon}</span>}
        <span className="micro">{title}</span>
      </div>
      {children}
    </div>
  )
}

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
      background: connected ? 'var(--ok)' : 'var(--text-mute)',
      boxShadow: connected ? '0 0 8px var(--ok)' : 'none',
    }} />
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
      const { tt_access_token: _unused, ...rest } = creds; void _unused
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
    <div style={{ maxWidth: 640, width: '100%', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="h1">Settings</h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>Manage integrations and API credentials</p>
        </div>
        <button
          onClick={() => setShowSecrets(s => !s)}
          className="btn ghost tiny"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <IconKey size={12} />
          {showSecrets ? 'Hide keys' : 'Show keys'}
        </button>
      </div>

      {/* Slot toggle */}
      <div style={{
        display: 'flex',
        padding: 3,
        background: 'var(--surface)',
        border: '1px solid var(--hairline)',
        borderRadius: 10,
        marginBottom: 20,
      }}>
        {(['personal', 'business'] as AccountSlot[]).map(s => (
          <button
            key={s}
            onClick={() => setSlot(s)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 600,
              textTransform: 'capitalize',
              color: slot === s ? 'var(--text)' : 'var(--text-mute)',
              background: slot === s ? 'var(--surface-3)' : 'transparent',
              transition: 'all 120ms ease',
              letterSpacing: '0.02em',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* OAuth banners */}
      {ttConnected && (
        <div style={{
          background: 'oklch(0.78 0.16 155 / 0.12)', border: '1px solid oklch(0.78 0.16 155 / 0.3)',
          color: 'var(--ok)', padding: '10px 16px', borderRadius: 10, fontSize: 13, marginBottom: 16,
        }}>
          TikTok connected successfully
        </div>
      )}
      {ttError && (
        <div style={{
          background: 'oklch(0.70 0.19 25 / 0.1)', border: '1px solid oklch(0.70 0.19 25 / 0.3)',
          color: 'var(--bad)', padding: '10px 16px', borderRadius: 10, fontSize: 13, marginBottom: 16,
        }}>
          TikTok connection failed: {ttError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Google */}
        <SectionCard title="Google Account" icon={<IconShield size={14} />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <StatusDot connected={!!acc} />
            {acc ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{acc.email}</span>
                {accountStatus?.active === slot && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 99,
                    background: 'oklch(0.80 0.16 80 / 0.15)',
                    border: '1px solid oklch(0.80 0.16 80 / 0.3)',
                    color: 'var(--accent)',
                  }}>Active</span>
                )}
              </>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-mute)', fontStyle: 'italic' }}>Not connected</span>
            )}
          </div>
          <a
            href={`/api/auth/connect?slot=${slot}`}
            className="btn"
            style={{ display: 'block', textAlign: 'center', fontSize: 12.5 }}
          >
            {acc ? 'Reconnect Google' : 'Connect Google'}
          </a>
        </SectionCard>

        {/* TikTok */}
        <SectionCard title="TikTok">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <StatusDot connected={ttConnectedSlot} />
            {ttConnectedSlot ? (
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>@{ttNames[slot] || 'Connected'}</span>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-mute)', fontStyle: 'italic' }}>Not connected</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleTtConnect} className="btn" style={{ flex: 1, fontSize: 12.5 }}>
              {ttConnectedSlot ? 'Switch account' : 'Connect TikTok'}
            </button>
            {ttConnectedSlot && (
              <button onClick={handleTtDisconnect} disabled={disconnecting} className="btn danger tiny" style={{ fontSize: 12 }}>
                {disconnecting ? '…' : 'Disconnect'}
              </button>
            )}
          </div>
        </SectionCard>

        {/* Instagram */}
        <SectionCard title="Instagram">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>Access Token</span>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={creds.ig_access_token ?? ''}
                onChange={e => setCred('ig_access_token', e.target.value)}
                placeholder="Paste access token..."
                autoComplete="off"
                className="input mono"
                style={{ fontSize: 12 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>Business Account ID</span>
              <input
                type="text"
                value={creds.ig_account_id ?? ''}
                onChange={e => setCred('ig_account_id', e.target.value)}
                placeholder="e.g. 17841465850620700"
                autoComplete="off"
                className="input mono"
                style={{ fontSize: 12 }}
              />
            </label>
          </div>
        </SectionCard>

        {/* Groq */}
        <SectionCard title="Groq — Whisper Transcription" icon={<IconKey size={14} />}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>API Key</span>
            <input
              type={showSecrets ? 'text' : 'password'}
              value={creds.groq_api_key ?? ''}
              onChange={e => setCred('groq_api_key', e.target.value)}
              placeholder="Paste API key..."
              autoComplete="off"
              className="input mono"
              style={{ fontSize: 12 }}
            />
          </label>
          <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 8 }}>console.groq.com → API Keys</div>
        </SectionCard>

        {/* Gemini */}
        <SectionCard title="Gemini — AI Analysis" icon={<IconKey size={14} />}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>API Key</span>
            <input
              type={showSecrets ? 'text' : 'password'}
              value={creds.gemini_api_key ?? ''}
              onChange={e => setCred('gemini_api_key', e.target.value)}
              placeholder="Paste API key..."
              autoComplete="off"
              className="input mono"
              style={{ fontSize: 12 }}
            />
          </label>
          <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 8 }}>aistudio.google.com → Get API Key</div>
        </SectionCard>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'oklch(0.70 0.19 25 / 0.1)', border: '1px solid oklch(0.70 0.19 25 / 0.3)',
          color: 'var(--bad)', padding: '10px 16px', borderRadius: 10, fontSize: 13, marginTop: 16,
        }}>
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn primary big"
        style={{
          width: '100%',
          marginTop: 20,
          ...(saved ? {
            background: 'oklch(0.78 0.16 155 / 0.15)',
            boxShadow: 'none',
            color: 'var(--ok)',
            borderColor: 'oklch(0.78 0.16 155 / 0.3)',
          } : {}),
        }}
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save credentials'}
      </button>
    </div>
  )
}
