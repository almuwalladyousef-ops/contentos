'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

const fields = [
  { section: 'INSTAGRAM', key: 'ig_access_token', label: 'Access Token', hint: 'developers.facebook.com → Graph API Explorer → generate token with instagram_basic + instagram_content_publish scopes' },
  { section: 'INSTAGRAM', key: 'ig_account_id', label: 'Business Account ID', hint: 'Graph API Explorer: GET /me?fields=instagram_business_account' },
  { section: 'TIKTOK', key: 'tt_access_token', label: 'Access Token', hint: 'developers.tiktok.com → sandbox → Tools → Access Token Generator' },
  { section: 'GROQ', key: 'groq_api_key', label: 'API Key', hint: 'console.groq.com → API Keys → Create API Key' },
  { section: 'GEMINI', key: 'gemini_api_key', label: 'API Key', hint: 'aistudio.google.com → Get API Key' },
]

const sectionOrder = ['INSTAGRAM', 'TIKTOK', 'GROQ', 'GEMINI']

export default function SettingsPage() {
  const { data: session } = useSession()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    fetch('/api/drive/credentials')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) setValues(data)
      })
  }, [session])

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
    fields: fields.filter(f => f.section === s),
  }))

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '4px', letterSpacing: '0.1em' }}>GOOGLE</div>
        <div style={{ color: '#22c55e', fontSize: '13px' }}>
          {session ? `● connected as ${session.user?.email}` : '● not connected'}
        </div>
        <div style={{ color: '#555', fontSize: '11px', marginTop: '4px' }}>
          Google account handles YouTube uploads and Drive storage automatically.
        </div>
      </div>

      {sections.map(section => (
        <div key={section.name} style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', color: '#555', marginBottom: '12px', letterSpacing: '0.1em' }}>
            [{section.name}]
          </div>
          {section.fields.map(field => (
            <div key={field.key} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#e0e0e0', fontSize: '12px', marginBottom: '6px' }}>
                {field.label}
              </label>
              <input
                type="password"
                value={values[field.key] ?? ''}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                placeholder={`paste ${field.label.toLowerCase()}`}
                autoComplete="off"
              />
              <div style={{ color: '#555', fontSize: '11px', marginTop: '4px' }}>{field.hint}</div>
            </div>
          ))}
        </div>
      ))}

      {error && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>{error}</div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          background: '#1e1e1e',
          border: '1px solid #2a2a2a',
          color: saving ? '#555' : '#e0e0e0',
          padding: '10px 20px',
          fontSize: '12px',
          letterSpacing: '0.05em',
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'SAVING...' : saved ? '✓ SAVED' : '[SAVE CREDENTIALS]'}
      </button>
    </div>
  )
}
