# SEO-Security Reference (Next.js on Vercel)

Contents: 1 Why it matters · 2 Hack/spam detection · 3 Indexing hygiene · 4 Redirects, canonicals, duplicates · 5 User-generated content · 6 Structured data & metadata safety · 7 Search Console & monitoring · 8 Security vs performance trade-offs · 9 Clean-up playbook after a compromise

## 1. Why it matters

A compromised or sloppy site loses rankings fast: Google flags "hacked content" or "social engineering" (red interstitial warning in Chrome), injected spam pages dilute the site, leaked private URLs get indexed, and slow pages from badly configured security hurt Core Web Vitals. This phase checks both directions: attacks that damage SEO, and security changes that could damage SEO.

## 2. Hack / spam detection

Run these (read-only) against the production domain.

```bash
# Spam keywords indexed? (manual in browser:  site:example.com viagra OR casino OR "buy cheap" OR replica OR "payday loan" OR porn OR slot gacor OR judi)
# Cloaking test: compare what Googlebot sees vs a normal visitor
curl -s -A "Mozilla/5.0" https://example.com/ -o normal.html
curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" https://example.com/ -o bot.html
diff <(sed 's/\s\+/ /g' normal.html) <(sed 's/\s\+/ /g' bot.html) | head -50
# Also with Referer: https://www.google.com/  (some hacks only show spam to visitors arriving from Google)
curl -s -A "Mozilla/5.0" -e "https://www.google.com/" https://example.com/ -o fromgoogle.html
# Hidden links / injected iframes / odd scripts in HTML
grep -Eio '<a[^>]+(display:\s*none|visibility:\s*hidden|left:\s*-[0-9]{3,}px)[^>]*>' normal.html | head
grep -Eio '<iframe[^>]*>|<script[^>]+src="https?://[^"]+"' normal.html | sort -u
# Unexpected URLs in sitemap, doorway pages
curl -s https://example.com/sitemap.xml | grep -o '<loc>[^<]*' | sed 's/<loc>//' | head -200
```

Red flags: Japanese/Chinese/pharma keywords in titles, thousands of URLs you didn't create, `<meta http-equiv="refresh">` or JS redirects to unknown domains for mobile/Google referrals, new `.php` URLs on a Next.js site (it has none = injected), changed `robots.txt`, unfamiliar entries in Search Console > Users and permissions, unfamiliar verification meta tag/HTML file.

Code-side causes on this stack: compromised dependency, leaked Vercel/GitHub token pushing a commit, XSS/stored content injected via CMS or Supabase table that renders raw HTML, open redirect abused in spam emails, subdomain takeover, malicious third-party tag in Google Tag Manager. Check `git log` for unknown commits/authors, Vercel deployment history, GTM container versions, Supabase tables that feed page content.

## 3. Indexing hygiene

- **Never rely on robots.txt for secrecy.** It prevents crawling, not indexing, and it publicly lists paths. Protect admin with auth; add `noindex`
- Admin, dashboard, account, checkout, thank-you, internal search, API docs for private APIs: `export const metadata = { robots: { index: false, follow: false } }` and/or `X-Robots-Tag: noindex, nofollow` via headers in `next.config.js`
- Preview/staging: Vercel Deployment Protection ON; verify `x-robots-tag: noindex` on `*.vercel.app` previews; production domain must NOT return noindex (a leftover `noindex` after launch is a classic SEO killer)
- Make sure the `*.vercel.app` production URL redirects or canonicalises to the custom domain to avoid duplicate-content indexing
- `app/robots.ts`:

```ts
import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  const base = 'https://example.com';
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard/', '/admin/'] }], sitemap: `${base}/sitemap.xml`, host: base };
}
```
(Listing `/admin/` in robots reveals it exists; harmless if it's properly authenticated, and still preferred to be `noindex` + auth. Skip listing truly sensitive names.)

- `app/sitemap.ts` generated from public published content only; filter out drafts, private rows, test data
- 404s: real 404 status for unknown paths (soft-404 spam is a hack signature); `notFound()` in dynamic routes when the DB row doesn't exist

## 4. Redirects, canonicals, duplicates

- One canonical host: choose apex or `www`; 308 redirect the other; HTTPS only; consistent trailing slash
- `metadata.alternates.canonical` on every indexable page; absolute URLs; derived from a trusted constant, not from the `Host` header (host-header poisoning)
- Open redirects (`/redirect?url=`) get abused in phishing + spam. Allow-list (see nextjs-vercel-security.md section 6)
- Query-parameter spam: `/?s=casino` or `/search?q=...` pages should be `noindex` and not reflect unsanitised text into `<title>`/H1
- Check there is no wildcard route that returns 200 for any path (`/anything-123` should 404)
- Redirect chains: max 1 hop

## 5. User-generated content (UGC)

- Links in user content: `rel="ugc nofollow noopener noreferrer"`; strip `javascript:` URLs
- Moderate/limit new accounts posting links; CAPTCHA + rate limits on profile pages, comments, reviews, forms (profile spam is the most common abuse of Supabase-backed apps)
- Public profile pages of new/empty users: `noindex` until the profile has real content or the account is verified
- Contact/lead forms: honeypot field + server-side validation to prevent header injection and spam relay

## 6. Structured data and metadata safety

- JSON-LD built from trusted data; escape `<` (see XSS section); validate with Rich Results Test
- Don't render user-controlled strings into `<title>`, meta description, OG tags without length limits and escaping (Next.js escapes, but a custom `<script>` injection does not)
- OG/Twitter images: serve from own domain; avoid hotlinking
- Check for hidden text or keyword stuffing introduced by plugins/AI-written content; check `lang`, `hreflang` correctness if multilingual (and that spam languages are absent)

## 7. Search Console and monitoring (user does these in the dashboard)

- Verify the **Domain property** (DNS TXT via GoDaddy). Keep the verification TXT record; review owners/users regularly and remove unknown ones
- Check: Security & Manual Actions > both must be "No issues detected"; Pages report for sudden spikes of indexed URLs; Crawl stats for abnormal request spikes; Core Web Vitals report
- Enable email alerts; also add Bing Webmaster Tools
- Set Google Alerts for `site:yourdomain.com` + spam terms
- Uptime + synthetic checks that fetch the homepage and assert expected title/H1 (detect defacement or injected content)
- Check Safe Browsing status page; if flagged, fix first, then request a review

## 8. Security vs performance trade-offs (don't trade SEO for nothing)

- Strict CSP can silently break GA4/GTM, fonts, embeds, consent banners. Use Report-Only first and test in the browser console
- `Cache-Control` on HTML: keep ISR/static where possible; do not add `no-store` to public pages just for safety (hurts TTFB/CWV)
- Bot protection / Attack Challenge Mode: never challenge verified crawlers. Vercel's Bot Protection lets verified bots through; custom WAF rules must not block Googlebot (verify by reverse DNS if needed)
- Rate limits must exclude `/robots.txt`, `/sitemap.xml` and static assets
- HSTS preload and redirects reduce HTTP hops and are positive for SEO
- Measure before/after: Lighthouse (LCP, CLS, INP) on the top 3 pages, and `curl -w "%{time_starttransfer}"` for TTFB

## 9. Clean-up playbook after a compromise

1. Contain: rotate all secrets (Supabase, Vercel tokens, GitHub tokens, GoDaddy password + 2FA, email), remove unknown collaborators/deploy hooks/integrations
2. Redeploy from a known-good commit; verify with `git log` and Vercel deployment diff
3. Purge injected DB content (Supabase tables that render on pages); search with SQL for `<script`, `<iframe`, `eval(`, spam keywords
4. Return 404/410 for spam URLs (410 speeds removal); remove from sitemap
5. Search Console: Removals tool for spam URLs, submit clean sitemap, request review if a manual action/security issue exists
6. Fix root cause (vuln or leaked credential) before requesting review, or it recurs
7. Monitor weekly for 8 weeks
