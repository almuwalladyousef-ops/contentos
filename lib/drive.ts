import { google } from 'googleapis'
import { Credentials } from './types'

const FOLDER_NAME = 'ContentOS'
const SUBFOLDERS = ['analysis', 'transcripts', 'temp']

type FolderCache = { rootId: string; analysisId: string; transcriptsId: string; tempId: string }
const folderCache = new Map<string, FolderCache>()

function normalizeCredentials(creds: Credentials): Credentials {
  return {
    ...creds,
    ig_access_token: creds.ig_access_token?.trim(),
    ig_account_id: creds.ig_account_id?.trim(),
    tt_access_token: creds.tt_access_token?.trim(),
    tt_refresh_token: creds.tt_refresh_token?.trim(),
    groq_api_key: creds.groq_api_key?.trim(),
    gemini_api_key: creds.gemini_api_key?.trim(),
  }
}

export function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.drive({ version: 'v3', auth })
}

export async function ensureFolderStructure(accessToken: string): Promise<{
  rootId: string
  analysisId: string
  transcriptsId: string
  tempId: string
}> {
  const cached = folderCache.get(accessToken)
  if (cached) return cached

  const drive = getDriveClient(accessToken)

  // Find or create root ContentOS folder
  const rootSearch = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  })

  let rootId: string
  if (rootSearch.data.files?.length) {
    rootId = rootSearch.data.files[0].id!
  } else {
    const created = await drive.files.create({
      requestBody: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    })
    rootId = created.data.id!
  }

  // Find or create subfolders
  const ids: Record<string, string> = {}
  for (const sub of SUBFOLDERS) {
    const search = await drive.files.list({
      q: `name='${sub}' and '${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    })
    if (search.data.files?.length) {
      ids[sub] = search.data.files[0].id!
    } else {
      const created = await drive.files.create({
        requestBody: { name: sub, mimeType: 'application/vnd.google-apps.folder', parents: [rootId] },
        fields: 'id',
      })
      ids[sub] = created.data.id!
    }
  }

  // Ensure history.json exists
  const historySearch = await drive.files.list({
    q: `name='history.json' and '${rootId}' in parents and trashed=false`,
    fields: 'files(id)',
  })
  if (!historySearch.data.files?.length) {
    await drive.files.create({
      requestBody: { name: 'history.json', parents: [rootId], mimeType: 'application/json' },
      media: { mimeType: 'application/json', body: '[]' },
    })
  }

  const result = { rootId, analysisId: ids.analysis, transcriptsId: ids.transcripts, tempId: ids.temp }
  folderCache.set(accessToken, result)
  return result
}

export async function readJsonFile<T>(accessToken: string, folderId: string, filename: string): Promise<T | null> {
  const drive = getDriveClient(accessToken)
  const search = await drive.files.list({
    q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
  })
  if (!search.data.files?.length) return null
  const fileId = search.data.files[0].id!
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' })
  return JSON.parse(res.data as string) as T
}

export async function writeJsonFile(accessToken: string, folderId: string, filename: string, data: unknown): Promise<string> {
  const drive = getDriveClient(accessToken)
  const body = JSON.stringify(data, null, 2)

  const search = await drive.files.list({
    q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
  })

  if (search.data.files?.length) {
    const fileId = search.data.files[0].id!
    await drive.files.update({
      fileId,
      media: { mimeType: 'application/json', body },
    })
    return fileId
  } else {
    const created = await drive.files.create({
      requestBody: { name: filename, parents: [folderId], mimeType: 'application/json' },
      media: { mimeType: 'application/json', body },
    })
    return created.data.id!
  }
}

export async function writeTextFile(accessToken: string, folderId: string, filename: string, text: string): Promise<string> {
  const drive = getDriveClient(accessToken)
  const created = await drive.files.create({
    requestBody: { name: filename, parents: [folderId], mimeType: 'text/plain' },
    media: { mimeType: 'text/plain', body: text },
  })
  return created.data.id!
}

export async function uploadTempVideo(accessToken: string, tempFolderId: string, buffer: Buffer, filename: string): Promise<string> {
  const drive = getDriveClient(accessToken)
  const { Readable } = await import('stream')
  const stream = Readable.from(buffer)

  const created = await drive.files.create({
    requestBody: { name: filename, parents: [tempFolderId], mimeType: 'video/mp4' },
    media: { mimeType: 'video/mp4', body: stream },
    fields: 'id',
  })
  const fileId = created.data.id!

  // Make publicly readable
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  return fileId
}

export async function getTikTokToken(googleAccessToken: string, rootId: string, slot: string): Promise<string | null> {
  const creds = await getCredentials(googleAccessToken, slot)
  if (!creds?.tt_access_token) return null

  const expiresAt = creds.tt_expires_at ?? 0
  const isExpired = Date.now() > expiresAt - 60_000 // refresh 1 min before expiry

  if (!isExpired) return creds.tt_access_token
  if (!creds.tt_refresh_token) return creds.tt_access_token // no refresh token, try anyway

  try {
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: creds.tt_refresh_token,
      }),
    })
    const data = await res.json()
    const newToken = data.access_token ?? data.data?.access_token
    const newRefresh = data.refresh_token ?? data.data?.refresh_token
    const expiresIn = data.expires_in ?? data.data?.expires_in ?? 86400

    if (newToken) {
      await saveCredentials(googleAccessToken, rootId, {
        ...creds,
        tt_access_token: newToken,
        tt_refresh_token: newRefresh ?? creds.tt_refresh_token,
        tt_expires_at: Date.now() + expiresIn * 1000,
      }, slot)
      return newToken
    }
  } catch { /* fall through */ }

  return creds.tt_access_token // return old token if refresh fails
}

export async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  const drive = getDriveClient(accessToken)
  await drive.files.delete({ fileId })
}

export async function getCredentials(accessToken: string, slot = 'personal'): Promise<Credentials | null> {
  const drive = getDriveClient(accessToken)
  const filename = `credentials-${slot}.json`
  const search = await drive.files.list({
    q: `name='${filename}' and trashed=false`,
    fields: 'files(id)',
  })
  if (!search.data.files?.length) return null
  const fileId = search.data.files[0].id!
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' })
  return normalizeCredentials(JSON.parse(res.data as string) as Credentials)
}

export async function saveCredentials(accessToken: string, rootFolderId: string, creds: Credentials, slot = 'personal'): Promise<void> {
  await writeJsonFile(accessToken, rootFolderId, `credentials-${slot}.json`, normalizeCredentials(creds))
}
