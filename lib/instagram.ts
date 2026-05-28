import { Credentials } from './types'

export const INSTAGRAM_GRAPH_BASE = 'https://graph.facebook.com/v21.0'

type GraphError = {
  message?: string
  type?: string
  code?: number
  error_subcode?: number
}

type GraphResponse<T> = T & { error?: GraphError }

type MediaProbeResponse = {
  data?: unknown[]
}

type PageInstagramResponse = {
  instagram_business_account?: {
    id?: string
    username?: string
  }
}

type AccountsResponse = {
  data?: Array<{
    id?: string
    name?: string
    access_token?: string
    instagram_business_account?: {
      id?: string
      username?: string
    }
  }>
}

export function instagramGraphUrl(path: string, params: Record<string, string>) {
  const url = new URL(`${INSTAGRAM_GRAPH_BASE}/${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

async function fetchGraph<T>(path: string, params: Record<string, string>): Promise<GraphResponse<T>> {
  const res = await fetch(instagramGraphUrl(path, params))
  return await res.json() as GraphResponse<T>
}

function isMissingMediaEdge(error?: GraphError) {
  return error?.code === 100 && error.message?.toLowerCase().includes('nonexisting field (media)')
}

async function canReadMedia(accountId: string, token: string) {
  const data = await fetchGraph<MediaProbeResponse>(`${accountId}/media`, {
    fields: 'id',
    limit: '1',
    access_token: token,
  })
  return { ok: !data.error, error: data.error }
}

async function resolveFromPage(pageId: string, token: string) {
  const page = await fetchGraph<PageInstagramResponse>(pageId, {
    fields: 'instagram_business_account{id,username}',
    access_token: token,
  })
  return page.instagram_business_account?.id
}

async function resolveFromUserPages(token: string, preferredPageId?: string) {
  const accounts = await fetchGraph<AccountsResponse>('me/accounts', {
    fields: 'id,name,access_token,instagram_business_account{id,username}',
    access_token: token,
  })
  if (!accounts.data?.length || !preferredPageId) return null

  const preferred = accounts.data.find(page => page.id === preferredPageId)
  return preferred?.instagram_business_account?.id ?? null
}

export async function resolveInstagramCredentials(creds: Credentials): Promise<{
  creds: Credentials
  changed: boolean
  mediaError?: GraphError
}> {
  const token = creds.ig_access_token?.trim()
  const savedAccountId = creds.ig_account_id?.trim()
  if (!token || !savedAccountId) return { creds, changed: false }

  const probe = await canReadMedia(savedAccountId, token)
  if (probe.ok) return { creds: { ...creds, ig_access_token: token, ig_account_id: savedAccountId }, changed: false }

  let resolvedId: string | null = null
  if (isMissingMediaEdge(probe.error)) {
    resolvedId = await resolveFromPage(savedAccountId, token) ?? null
    resolvedId ??= await resolveFromUserPages(token, savedAccountId)
  }

  if (!resolvedId || resolvedId === savedAccountId) {
    return { creds: { ...creds, ig_access_token: token, ig_account_id: savedAccountId }, changed: false, mediaError: probe.error }
  }

  const resolvedProbe = await canReadMedia(resolvedId, token)
  if (!resolvedProbe.ok) {
    return { creds: { ...creds, ig_access_token: token, ig_account_id: savedAccountId }, changed: false, mediaError: resolvedProbe.error }
  }

  return {
    creds: { ...creds, ig_access_token: token, ig_account_id: resolvedId },
    changed: true,
  }
}

export function instagramGraphErrorMessage(prefix: string, error?: GraphError) {
  if (!error) return prefix
  const code = error.code ? `#${error.code}` : 'Graph API'
  const subcode = error.error_subcode ? `/${error.error_subcode}` : ''
  return `${prefix}: (${code}${subcode}) ${error.message ?? 'Unknown Instagram error'}`
}
