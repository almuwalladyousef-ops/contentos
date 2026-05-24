import { cookies } from 'next/headers'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

export type AccountSlot = 'personal' | 'business'

export interface StoredAccount {
  email: string
  access_token: string
  refresh_token: string
  expires_at: number
}

function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET!
  const buf = Buffer.from(secret, 'base64')
  return buf.length >= 32 ? buf.slice(0, 32) : Buffer.concat([buf, Buffer.alloc(32 - buf.length)])
}

function encrypt(text: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

function decrypt(text: string): string {
  const [ivHex, tagHex, encHex] = text.split(':')
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') + decipher.final('utf8')
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 365,
  path: '/',
}

export async function getAccountsStatus() {
  const jar = await cookies()
  const active = (jar.get('cms_active')?.value ?? 'personal') as AccountSlot

  const getSlotInfo = (slot: AccountSlot) => {
    const val = jar.get(`cms_${slot}`)?.value
    if (!val) return null
    try {
      return { email: (JSON.parse(decrypt(val)) as StoredAccount).email }
    } catch {
      return null
    }
  }

  return { active, personal: getSlotInfo('personal'), business: getSlotInfo('business') }
}

export async function saveAccount(slot: AccountSlot, account: StoredAccount): Promise<void> {
  const jar = await cookies()
  jar.set(`cms_${slot}`, encrypt(JSON.stringify(account)), COOKIE_OPTS)
  jar.set('cms_active', slot, COOKIE_OPTS)
}

export async function switchAccount(slot: AccountSlot): Promise<void> {
  const jar = await cookies()
  jar.set('cms_active', slot, COOKIE_OPTS)
}

async function refreshAccessToken(account: StoredAccount): Promise<StoredAccount> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const json = await res.json()
  if (!json.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(json)}`)
  return {
    ...account,
    access_token: json.access_token,
    expires_at: Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
  }
}

export async function getActiveAccount(): Promise<{ accessToken: string; email: string; slot: AccountSlot } | null> {
  const jar = await cookies()
  const active = (jar.get('cms_active')?.value ?? 'personal') as AccountSlot
  const val = jar.get(`cms_${active}`)?.value
  if (!val) return null

  try {
    let account = JSON.parse(decrypt(val)) as StoredAccount

    if (account.expires_at - Math.floor(Date.now() / 1000) < 300) {
      account = await refreshAccessToken(account)
      jar.set(`cms_${active}`, encrypt(JSON.stringify(account)), COOKIE_OPTS)
    }

    return { accessToken: account.access_token, email: account.email, slot: active }
  } catch {
    return null
  }
}
