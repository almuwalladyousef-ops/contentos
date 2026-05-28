'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { IconKey, IconShield, IconCheck } from '@/components/Icons'
import { LogoTikTok, LogoInstagram } from '@/components/Icons'

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

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h5.6c-.2 1.3-1 2.4-2 3.1v2.6h3.3c1.9-1.8 3.1-4.4 3.1-7.8z" fill="oklch(0.65 0.18 245)" />
      <path d="M12 22c2.7 0 5-.9 6.7-2.5l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6C4.7 19.7 8.1 22 12 22z" fill="oklch(0.7 0.18 145)" />
      <path d="M6.4 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H3C2.4 9 2 10.4 2 12s.4 3 1 4.4l3.4-2.6z" fill="oklch(0.78 0.16 75)" />
      <path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.1 2 4.7 4.3 3 7.6l3.4 2.6C7.2 7.8 9.4 6 12 6z" fill="oklch(0.65 0.21 25)" />
    </svg>
  )
}

function ProviderMark({ label, tone }: { label: string; tone: string }) {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: 7,
      background: `linear-gradient(135deg, ${tone}, oklch(0.55 0.16 calc(280)))`,
      display: 'grid', placeItems: 'center',
      fontSize: 12, fontWeight: 700, color: 'oklch(0.18 0.013 255)',
      fontFamily: 'var(--font-mono)',
    }}>{label}</div>
  )
}

function SectionHead({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <div>
        {eyebrow && <div className="micro" style={{ marginBottom: 4 }}>{eyebrow}</div>}
        <h2 className="h2">{title}</h2>
      </div>
    </div>
  )
}

function IntegrationCard({ title, sub, connected, identity, actionLabel, onAction, secondaryAction, onSecondary, icon, color, children }: {
  title: string
  sub: string
  connected: boolean
  identity?: string | null
  actionLabel?: string
  onAction?: () => void
  secondaryAction?: string | null
  onSecondary?: () => void
  icon?: React.ReactNode
  color?: string
  children?: React.ReactNode
}) {
  return (
    <div className="card" style={{ padding: 'var(--pad)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: color ? `oklch(from ${color} l c h / 0.12)` : 'var(--bg-2)',
          color: color || 'var(--text)',
          display: 'grid', placeItems: 'center',
          border: '1px solid', borderColor: color ? `oklch(from ${color} l c h / 0.3)` : 'var(--hairline)',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
            {connected ? (
              <span className="pill ok" style={{ height: 18, fontSize: 10 }}><span className="dot" /> connected</span>
            ) : (
              <span className="pill" style={{ height: 18, fontSize: 10 }}><span className="dot" /> not connected</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 2 }}>{sub}</div>
          {identity && (
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 8 }}>{identity}</div>
          )}
        </div>
        {actionLabel && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {secondaryAction && (
              <button
                className="btn tiny"
                onClick={onSecondary}
                style={{ color: 'var(--bad)', borderColor: 'oklch(0.70 0.19 25 / 0.3)' }}
              >
                {secondaryAction}
              </button>
            )}
            <button className="btn tiny" onClick={onAction}>{actionLabel}</button>
          </div>
        )}
      </div>
      {children && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, show, mono }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  show?: boolean
  mono?: boolean
}) {
  return (
    <div>
      <label className="micro" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type={show === false ? 'password' : 'text'}
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        style={mono ? { fontFamily: 'var(--font-mono)', fontSize: 12.5 } : undefined}
      />
    </div>
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
  const [showKeys, setShowKeys] = useState(false)

  const ttConnected = searchParams.get('tt_connected') === '1'
  const ttError = searchParams.get('tt_error')
  const igConnected = searchParams.get('ig_connected') === '1'
  const igError = searchParams.get('ig_error')

  useEffect(() => {
    if ((ttConnected || igConnected) && typeof window !== 'undefined' && window.opener) {
      window.opener.location.reload()
      window.close()
    }
  }, [ttConnected, igConnected])

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then((status: AccountStatus) => {
        setAccountStatus(status)
        setSlot(status.active)
      })
      .catch(() => {})
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
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/drive/credentials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...creds, slot }) })
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

  async function handleGoogleDisconnect() {
    if (!confirm(`Disconnect ${accountStatus?.[slot]?.email ?? 'Google account'}? You'll need to reconnect to use Drive, YouTube, and Analytics.`)) return
    setDisconnecting(true)
    try {
      await fetch('/api/auth/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot }) })
      setAccountStatus(prev => prev ? { ...prev, [slot]: null } : prev)
    } catch { /* ignore */ } finally {
      setDisconnecting(false)
    }
  }

  async function handleTtDisconnect() {
    setDisconnecting(true)
    try {
      const { tt_access_token: _unused, ...rest } = creds; void _unused
      await fetch('/api/drive/credentials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...rest, slot }) })
      setAllCreds(prev => ({ ...prev, [slot]: { ...prev[slot], tt_access_token: '' } }))
      setTtTokens(prev => ({ ...prev, [slot]: '' }))
    } catch { /* ignore */ } finally {
      setDisconnecting(false)
    }
  }

  function handleIgConnect() {
    const url = `/api/auth/instagram/connect?slot=${slot}`
    const popup = window.open(url, 'instagram-auth', 'width=640,height=760,scrollbars=yes,resizable=yes')
    if (!popup) window.location.href = url
  }

  async function handleIgDisconnect() {
    setDisconnecting(true)
    try {
      const { ig_access_token: _token, ig_account_id: _accountId, ...rest } = creds
      void _token
      void _accountId
      await fetch('/api/drive/credentials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...rest, slot }) })
      setAllCreds(prev => ({ ...prev, [slot]: { ...prev[slot], ig_access_token: '', ig_account_id: '' } }))
    } catch { /* ignore */ } finally {
      setDisconnecting(false)
    }
  }

  const acc = accountStatus?.[slot]
  const ttConnectedSlot = !!ttTokens[slot]
  const igConnectedSlot = !!creds.ig_access_token && !!creds.ig_account_id
  const connectedCount = [acc, ttConnectedSlot, igConnectedSlot, creds.groq_api_key, creds.gemini_api_key].filter(Boolean).length

  return (
    <div className="anim-up" style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="micro" style={{ marginBottom: 4 }}>Workspace · {slot}</div>
          <h1 className="h1">Settings</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="pill"><span className="dot" style={{ background: 'var(--ok)' }} />{connectedCount}/5 connected</span>
          <button className="btn ghost" onClick={() => setShowKeys(s => !s)}>
            <IconKey size={14} /> {showKeys ? 'Hide' : 'Show'} keys
          </button>
        </div>
      </div>

      {/* OAuth banners */}
      {ttConnected && (
        <div style={{ background: 'oklch(0.78 0.16 155 / 0.12)', border: '1px solid oklch(0.78 0.16 155 / 0.3)', color: 'var(--ok)', padding: '10px 16px', borderRadius: 10, fontSize: 13 }}>
          TikTok connected successfully
        </div>
      )}
      {ttError && (
        <div style={{ background: 'oklch(0.70 0.19 25 / 0.1)', border: '1px solid oklch(0.70 0.19 25 / 0.3)', color: 'var(--bad)', padding: '10px 16px', borderRadius: 10, fontSize: 13 }}>
          TikTok connection failed: {ttError}
        </div>
      )}
      {igConnected && (
        <div style={{ background: 'oklch(0.78 0.16 155 / 0.12)', border: '1px solid oklch(0.78 0.16 155 / 0.3)', color: 'var(--ok)', padding: '10px 16px', borderRadius: 10, fontSize: 13 }}>
          Instagram connected successfully
        </div>
      )}
      {igError && (
        <div style={{ background: 'oklch(0.70 0.19 25 / 0.1)', border: '1px solid oklch(0.70 0.19 25 / 0.3)', color: 'var(--bad)', padding: '10px 16px', borderRadius: 10, fontSize: 13 }}>
          Instagram connection failed: {igError}
        </div>
      )}

      {/* Integrations section */}
      <SectionHead eyebrow="Connections" title="Integrations" />

      <IntegrationCard
        title="Google account"
        sub="Drive · YouTube · Analytics"
        connected={!!acc}
        identity={acc?.email}
        actionLabel={acc ? 'Reconnect' : 'Connect Google'}
        onAction={() => { window.location.href = `/api/auth/connect?slot=${slot}` }}
        secondaryAction={acc ? (disconnecting ? '…' : 'Disconnect') : null}
        onSecondary={handleGoogleDisconnect}
        icon={<GoogleMark />}
      />

      <IntegrationCard
        title="TikTok"
        sub="Direct posting · Login Kit"
        connected={ttConnectedSlot}
        identity={ttConnectedSlot ? `@${ttNames[slot] || 'Connected'}` : null}
        actionLabel={ttConnectedSlot ? 'Switch account' : 'Connect TikTok'}
        onAction={handleTtConnect}
        secondaryAction={ttConnectedSlot ? (disconnecting ? '…' : 'Disconnect') : null}
        onSecondary={handleTtDisconnect}
        icon={<LogoTikTok size={20} />}
        color="oklch(0.85 0.15 200)"
      />

      <IntegrationCard
        title="Instagram"
        sub="Reels via Graph API"
        connected={igConnectedSlot}
        actionLabel={igConnectedSlot ? 'Reconnect' : 'Connect Instagram'}
        onAction={handleIgConnect}
        secondaryAction={igConnectedSlot ? (disconnecting ? '…' : 'Disconnect') : null}
        onSecondary={handleIgDisconnect}
        icon={<LogoInstagram size={20} />}
        color="oklch(0.70 0.20 340)"
      />

      {/* AI section */}
      <SectionHead eyebrow="AI" title="Analysis providers" />

      <IntegrationCard
        title="Groq"
        sub="Whisper transcription · console.groq.com/keys"
        connected={!!creds.groq_api_key}
        icon={<ProviderMark label="G" tone="oklch(0.78 0.15 60)" />}
      >
        <Field
          label="API key"
          value={creds.groq_api_key ?? ''}
          show={showKeys}
          onChange={v => setCred('groq_api_key', v)}
          placeholder="gsk_…"
          mono
        />
      </IntegrationCard>

      <IntegrationCard
        title="Gemini"
        sub="Transcript analyzer · aistudio.google.com"
        connected={!!creds.gemini_api_key}
        icon={<ProviderMark label="G" tone="oklch(0.75 0.18 245)" />}
      >
        <Field
          label="API key"
          value={creds.gemini_api_key ?? ''}
          show={showKeys}
          onChange={v => setCred('gemini_api_key', v)}
          placeholder="AIza…"
          mono
        />
      </IntegrationCard>

      {/* Error */}
      {error && (
        <div style={{ background: 'oklch(0.70 0.19 25 / 0.1)', border: '1px solid oklch(0.70 0.19 25 / 0.3)', color: 'var(--bad)', padding: '10px 16px', borderRadius: 10, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Sticky save bar */}
      <div className="card" style={{
        padding: 16, display: 'flex', alignItems: 'center', gap: 14,
        flexWrap: 'wrap',
        position: 'sticky', bottom: 16,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <IconShield size={18} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
          Credentials are stored encrypted in your Drive. Never sent to ContentOS servers.
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn primary big"
          style={{
            marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
            ...(saved ? {
              background: 'oklch(0.78 0.16 155 / 0.15)',
              boxShadow: 'none',
              color: 'var(--ok)',
              borderColor: 'oklch(0.78 0.16 155 / 0.3)',
            } : {}),
          }}
        >
          <IconCheck size={14} />
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
