# ContentOS — one-time setup

After this is done, the whole app works by pressing **Connect** on each account in
**Settings**. There are no keys or tokens to paste anywhere in the UI ever again.

## What you connect in the app (zero config)

In **Settings** you'll see exactly three buttons:

| Button | Authorizes | Used for |
| --- | --- | --- |
| **Connect YouTube** | Google account | YouTube upload, Drive storage, analytics, email reports |
| **Connect Instagram** | Instagram (Business/Creator) | Reels publishing + insights |
| **Connect TikTok** | TikTok account | Direct posting + video stats |

Each is one OAuth click → authorize → done. Tokens are stored encrypted in your
browser session, **never in the UI, never in Drive**, and refresh automatically.

## The only thing you set up once: the app's OAuth credentials

OAuth requires each platform to know *which app* is asking for access, so every
platform makes you register a developer app once and gives you a client ID/secret.
You paste those into environment variables **one time** (locally and in Vercel) —
not into the app UI.

1. Copy `.env.example` to `.env.local` and fill it in.
2. Generate the cookie key: `openssl rand -base64 32` → `NEXTAUTH_SECRET`.
3. Register the three developer apps and set their redirect URIs to:
   - Google:    `<your-domain>/api/auth/callback`
   - TikTok:    `<your-domain>/api/auth/tiktok/callback`
   - Instagram: `<your-domain>/api/auth/instagram/callback`
4. In production, add the same variables in **Vercel → Project → Settings →
   Environment Variables**, and set `NEXTAUTH_URL` to your deployed URL.

That's the entire setup. From then on it's just the Connect buttons.

## Common "connect isn't working" causes

- **Blank/incorrect redirect** → `NEXTAUTH_URL` doesn't match the redirect URI
  registered in the provider console (or has a trailing slash). They must match exactly.
- **`*_error=... app not configured`** banner in Settings → that platform's
  `CLIENT_ID/SECRET` (or `APP_ID/SECRET`) env vars aren't set.
- **Instagram "No Business/Creator account found"** → your Instagram account must be
  a Business or Creator account linked to a Facebook Page you manage.
