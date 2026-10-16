# Next.js + Vercel Security Reference

Contents: 1 Headers & CSP · 2 Route handlers & Server Actions · 3 Middleware · 4 Input validation · 5 XSS/HTML · 6 SSRF & redirects · 7 CSRF & cookies · 8 Rate limiting · 9 Secrets & env · 10 Errors & info leaks · 11 Dependencies & supply chain · 12 Vercel platform settings · 13 Checklist

## 1. Security headers and CSP

`next.config.js` (adjust to the app's actual third-party needs):

```js
// next.config.js
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];
module.exports = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

Only add `preload` after confirming every subdomain serves HTTPS, since preload is hard to undo.

**CSP with nonces** (middleware generates a nonce per request, Next.js applies it to its own scripts when dynamic rendering is used):

```ts
// middleware.ts (merge with auth logic; see section 3)
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,           // if a lib needs inline styles, test before loosening
    `img-src 'self' blob: data: ${supabase}`,
    `font-src 'self'`,
    `connect-src 'self' ${supabase} ${supabase.replace('https', 'wss')}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');
  const headers = new Headers(req.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set('Content-Security-Policy', csp);   // switch to 'Content-Security-Policy-Report-Only' for first rollout
  return res;
}
export const config = { matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico).*)', missing: [{ type: 'header', key: 'next-router-prefetch' }] }] };
```

Roll-out: Report-Only for several days -> fix violations (analytics, fonts, embeds, payment widgets) -> enforce. Check SEO tools (Google Analytics, Tag Manager, Search Console verification) still work after enforcing.

## 2. Route handlers and Server Actions

Every `route.ts` and every `'use server'` function is a **public HTTP endpoint**. Hidden UI does not mean protected.

Checklist per endpoint:
1. **Authenticate**: derive the user from the session on the server (`supabase.auth.getUser()`), never from a client-sent `userId`
2. **Authorize**: check the user may act on *this* resource (ownership/role/tenant)
3. **Validate** input with a schema (zod) incl. types, lengths, enums
4. **Limit** method (`export async function POST` only), body size, rate
5. **Respond** with minimal data (select only needed columns; no `select('*')` of rows with secrets)

```ts
// app/api/notes/[id]/route.ts
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Params = z.object({ id: z.string().uuid() });
const Body = z.object({ title: z.string().min(1).max(200), body: z.string().max(10_000) });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = Params.parse(await ctx.params);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Bad request' }, { status: 400 });

  // RLS also enforces ownership; the explicit filter makes intent clear and fails closed
  const { data, error: dbErr } = await supabase.from('notes').update(parsed.data).eq('id', id).eq('user_id', user.id).select('id,title').single();
  if (dbErr || !data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(data);
}
```

Server Actions: same rules. Next.js has built-in Origin/Host comparison for Actions, but do not rely on it for authz. Never pass secrets or role flags through hidden form fields. Closures in actions can serialise captured values to the client, so avoid capturing sensitive data.

Admin routes: check role from DB (`is_admin()`), not from a cookie, JWT claim the user can influence, or a client flag.

## 3. Middleware

- Treat middleware as an **early filter only**. Re-check auth in the page/route/action and in RLS. Past Next.js advisories showed middleware-only protection can be bypassed (keep Next.js patched)
- Matcher mistakes are common: `/api/*` or `/admin/*` not covered, or static file regex accidentally matching dynamic paths. Test: request a protected path without a cookie, with trailing slash, with different case, with `/_next/data/...`, and with encoded characters. All must be denied by the *route itself* too
- Do not trust headers like `x-middleware-subrequest`; strip unexpected internal headers at the edge if you rely on custom ones (e.g. `x-user-id`) and never read identity from a request header that clients can set

## 4. Input validation

zod (or valibot) at every boundary: query, params, body, form data, webhooks, env vars (`@t3-oss/env-nextjs` or a zod parse at boot, so missing/misplaced secrets fail fast).

## 5. XSS and HTML

- React escapes by default. Findings come from `dangerouslySetInnerHTML`, `href={userUrl}` with `javascript:` scheme, `<a target="_blank">` without `rel="noopener noreferrer"`, markdown renderers with raw HTML on, and injected JSON-LD
- Sanitise any HTML with `isomorphic-dompurify` using a strict allow-list; validate URL schemes (`https:` / `http:` / `mailto:` only)
- JSON-LD safely: `JSON.stringify(data).replace(/</g, '\\u003c')`
- User-uploaded SVG/HTML must not be served inline from your origin
- CSP with nonce is the second line of defence, not a substitute

## 6. SSRF and open redirect

- Any server-side `fetch(userSuppliedUrl)` (image proxy, URL preview, webhook tester, `next/image` remote patterns): allow-list hostnames; block private ranges (127.0.0.0/8, 10/8, 172.16/12, 192.168/16, 169.254.169.254, ::1, fc00::/7), resolve DNS then check IP, disallow redirects or re-validate each hop, set timeout and size cap
- `next.config.js` `images.remotePatterns`: exact hostnames, no wildcards like `**`
- Redirect params (`next`, `redirect_to`, `callbackUrl`): accept only relative paths that start with a single `/` (and not `//` or `/\`), or exact allow-listed origins

```ts
export function safeNext(input: string | null, fallback = '/') {
  if (!input || !input.startsWith('/') || input.startsWith('//') || input.includes('\\')) return fallback;
  return input;
}
```

## 7. CSRF and cookies

- Auth cookies: `Secure`, `HttpOnly` where the SDK allows, `SameSite=Lax` (or `Strict` for admin), tight `Path`/`Domain` (don't set `Domain=.example.com` unless needed; it exposes cookies to all subdomains, which raises subdomain-takeover impact)
- State-changing routes using cookie auth: use POST/PUT/PATCH/DELETE only, verify `Origin` header matches your host, or use Server Actions / CSRF tokens. Never mutate on GET
- CORS: allow-list; never reflect arbitrary Origin with credentials

## 8. Rate limiting and abuse

Vercel has platform DDoS mitigation and a WAF with custom rules (Firewall tab). Add app-level limits for auth and costly endpoints:

```ts
// lib/ratelimit.ts  (Upstash Redis works on Vercel serverless/edge)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
export const limiter = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl' });
// in handler: const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'anon'; const { success } = await limiter.limit(`login:${ip}`); if (!success) return new Response('Too many requests', { status: 429 });
```

Targets: login, signup, password reset, OTP, contact/lead forms (also add CAPTCHA), AI/LLM endpoints (cost abuse), file upload, search. Vercel dashboard: enable Attack Challenge Mode when under attack; add WAF rules to block known bad paths (`/wp-admin`, `/xmlrpc.php`, `/.env`) and countries/ASNs if abuse is localised.

## 9. Secrets and environment variables

- `NEXT_PUBLIC_` = published to everyone. Only the Supabase URL, anon/publishable key, public analytics IDs belong there
- Vercel: Project > Settings > Environment Variables; mark secrets **Sensitive** (non-readable after creation); separate values per Production / Preview / Development; don't reuse production DB keys in Preview (preview URLs are guessable and may be shared)
- `.env*` in `.gitignore`; commit only `.env.example` with fake values
- Enable GitHub secret scanning + push protection; run `gitleaks detect` in CI
- Rotate on any suspicion, on staff change, and on a schedule

## 10. Errors and information leaks

- Return generic errors to clients; log details server-side only. Don't send `error.message` from Supabase/Postgres to the UI
- `app/error.tsx` and `global-error.tsx` must not print stack traces in production
- Remove debug routes (`/api/debug`, `/api/test`), `console.log` of tokens/PII
- `getServerSideProps`/Server Component props are serialised into HTML: never pass full DB rows with private fields to client components
- Don't expose internal IDs that are sequential when authorisation is weak (use UUIDs *and* proper authz)

## 11. Dependencies and supply chain

```bash
npm audit --omit=dev          # triage, don't blindly run `audit fix --force`
npx osv-scanner -r .          # optional, broader DB
npm outdated
```
- Search the web for current Next.js security advisories and compare with the installed version; upgrade to the latest patched release of your major line
- Commit the lockfile, use `npm ci` in CI, enable Dependabot/Renovate with security updates only auto-merge for patch
- Review new packages: downloads, maintainers, install scripts (`npm config set ignore-scripts true` in CI where feasible)
- Subresource Integrity for any third-party script/CDN tags

## 12. Vercel platform settings checklist

- Team/account: 2FA on for every member; least-privilege roles; remove ex-members; audit log reviewed
- Git integration: protect `main` (PR + review + status checks); restrict who can deploy to Production
- **Deployment Protection**: Vercel Authentication / password for Preview deployments (Settings > Deployment Protection) so previews with test data and `*.vercel.app` URLs aren't public or indexed; "Protection Bypass" tokens kept secret
- Preview deployments are served with `X-Robots-Tag: noindex` by default; verify, and make sure production domain is the canonical one
- Domains: only intended domains attached; redirect `www` <-> apex consistently; remove stale domains
- Logs & Observability: enable error alerts; consider log drain; Firewall/WAF rules; Bot Protection
- Env var hygiene (section 9); `vercel env pull` files stay out of git
- Cron routes (`/api/cron/*`) must verify `Authorization: Bearer ${CRON_SECRET}`
- Image optimisation: restrict `remotePatterns`; set `minimumCacheTTL`; avoid abuse of `/_next/image`
- Serverless function limits (`maxDuration`, memory) set sensibly to cap cost abuse; spend management / budget alerts on

## 13. Quick pass/fail checklist for the report

- [ ] No secrets in client bundle or git history
- [ ] Every route/action authenticates and authorizes
- [ ] RLS on every exposed table; tested with anon + user A/B
- [ ] CSP + HSTS + nosniff + frame-ancestors + referrer + permissions policy
- [ ] Input validated; outputs encoded; no unsafe HTML sinks
- [ ] Redirect/SSRF allow-lists
- [ ] Rate limits + CAPTCHA on auth and forms
- [ ] Generic errors; no debug routes; no source maps
- [ ] Dependencies patched; CI audit; secret scanning
- [ ] Vercel preview protection, 2FA, branch protection, spend alerts
