---
name: webapp-security-audit
description: End-to-end defensive security audit AND remediation for web apps built on Next.js (frontend/API), Supabase (database/auth/storage), Vercel (hosting) and a GoDaddy domain. Covers OWASP Top 10, Supabase RLS and key leaks, Next.js route/server-action/middleware flaws, Vercel env and header config, DNS/email-spoofing/TLS hygiene, and SEO-security (spam injection, cloaking, indexed admin/staging pages, sitemap/robots/canonical abuse). Use this skill whenever the user mentions security testing, pentest, vulnerability scan, security audit, hardening, "is my site safe", RLS check, leaked keys, security headers, DMARC/SPF, hacked SEO, or wants to fix security issues on their own Supabase/Next.js/Vercel project, even if they do not say "audit". Only for assets the user owns or is authorized to test.
---

# Web App Security Audit and Remediation

Stack this skill is tuned for: **Next.js (App Router or Pages) + Supabase + Vercel + GoDaddy DNS/domain**. The method works for similar stacks, but the reference files are written for this one.

The goal is two things, in this order: **find real, evidenced problems**, then **fix them and prove the fix worked**. A report full of generic advice is a failure. A short report where every finding has evidence, a severity, a concrete fix and a re-test result is a success.

## Phase 0: Scope and authorization (never skip)

Security testing against a system you don't own is illegal and can hurt real users, so confirm before touching anything.

Ask the user for (skip what is already known):
1. Production domain and any staging/preview URLs (e.g. `app.example.com`, `*.vercel.app`)
2. Repo path (the current workspace is usually it)
3. Supabase project ref (the `xxxx` in `xxxx.supabase.co`) and whether a **staging** Supabase project exists
4. Confirmation: "I own this system or have written permission to test it"
5. Two test accounts (low-privilege user A and user B, optionally an admin) for access-control tests

Rules of engagement, apply always:
- **Passive and read-only on production.** Active tests (auth bypass attempts, write attempts, fuzzing) run against staging or a local dev instance whenever one exists. If only production exists, limit to read-only requests and test-account data, and tell the user.
- No denial-of-service, no load tests, no brute-forcing real accounts, no social engineering, no touching third-party systems (GoDaddy, Vercel, Supabase infrastructure themselves are out of scope; only the user's configuration of them is in scope).
- Never print full secrets in the report. Show the first 6 characters and the location.
- Do not exfiltrate or store real user data. If a test reveals real personal data, stop, note the *class* of data exposed and the row count, and move on.
- Make fixes on a **git branch** (`security/audit-YYYY-MM-DD`), never directly on main, and get user approval before applying any change that alters behaviour (RLS policies, middleware, CSP).

## Workflow overview

```
0 Scope  ->  1 Passive recon  ->  2 Code review  ->  3 Supabase audit
         ->  4 Dynamic testing ->  5 DNS/Domain/Email -> 6 SEO-security
         ->  7 Report  ->  8 Remediate  ->  9 Re-test and close
```

Track the phases as a checklist and tell the user which phase you are in. Read reference files only when you reach the relevant phase.

### Phase 1: Passive recon (no payloads)

Run the bundled script against the production URL:

```bash
python3 scripts/passive_recon.py https://example.com --out recon.json
```

It checks: HTTPS redirect and HSTS, security headers, cookie flags, CORS reflection, TLS expiry, exposed files (`/.env`, `/.git/HEAD`, source maps), `robots.txt`/`sitemap.xml`/`security.txt`, SPF/DKIM-hint/DMARC/CAA/DNSSEC, and **JWTs embedded in the shipped JavaScript** (flags a Supabase `service_role` key, which is a critical finding).

Then manually look at the output and open the site's main pages to understand the app: login, signup, dashboard, API routes (`/api/*`), file uploads, payment/webhook endpoints.

### Phase 2: Code review (static)

Run the secret/misconfiguration scanner first, then review by hand:

```bash
bash scripts/code_scan.sh .
```

Then read `references/nextjs-vercel-security.md` and walk through its checklist against the repo. Prioritise by blast radius:
1. Secrets in the client bundle or git history
2. API routes and Server Actions without authentication/authorization
3. Use of the Supabase **service role key** anywhere reachable by a user request
4. Unvalidated input reaching DB queries, `fetch` (SSRF), `redirect`, `dangerouslySetInnerHTML`, file paths
5. Middleware that is the *only* auth check (middleware can be bypassed or mis-matched; always re-check in the route/action/RLS)
6. Dependencies: `npm audit --omit=dev`, plus check Next.js version against known advisories (search the web for current Next.js security advisories, because this changes often)

### Phase 3: Supabase audit

Read `references/supabase-security.md`. In short:
- Every table in `public` (and any exposed schema) must have **RLS enabled** with explicit policies. No RLS = anyone with the public anon key can read/write it.
- Run `scripts/rls_audit.sql` in the Supabase SQL editor (read-only queries) or through the Supabase MCP if connected. It lists tables without RLS, tables with RLS but no policies, overly permissive policies (`using (true)`), `SECURITY DEFINER` functions, views bypassing RLS, public storage buckets, and risky grants.
- Test from the outside with the **anon key** and with **user A's JWT** (see Phase 4) to confirm the policies behave the way the SQL says.
- Check Auth settings: email confirmation, password policy/leaked-password protection, OTP expiry, redirect URL allowlist (no wildcards on production), MFA for admins, signups disabled if not intended.

### Phase 4: Dynamic testing (safe, evidence-based)

Use the browser tool (if available) and `curl`. Test only what the scope allows. Core cases:

| Area | Test |
|---|---|
| Broken access control (IDOR) | As user A, request user B's resource IDs on every API route and Supabase table. Expect 401/403/empty |
| Vertical privilege | As a normal user, call admin routes/actions and try changing own `role`/`is_admin` field via the Supabase client |
| Anon access | With only the anon key, `select` from each table and list each storage bucket |
| AuthN | Unauthenticated access to protected pages/APIs, session fixation, logout invalidation, password-reset link reuse and expiry, email enumeration via different error messages |
| Injection / XSS | Harmless marker payloads (`"><svg/onload=confirm(1)>` style markers) in forms, query strings and profile fields; check reflected and stored output encoding. No destructive SQL; Supabase queries are parameterised, so look at `rpc()` functions and raw SQL in Postgres functions instead |
| CSRF | State-changing routes with cookies: check SameSite, Origin check, Server Action behaviour |
| SSRF / open redirect | Any param that takes a URL (`redirect`, `next`, `callbackUrl`, image proxy, webhook URL). Test with an external benign domain and with `http://169.254.169.254` only on a local/staging instance |
| File upload | Type and size limits, content-type spoofing, public bucket exposure, SVG/HTML upload served inline |
| Rate limiting | A small burst (about 20 requests) against login, signup, password reset, OTP, contact form. Expect 429 or lockout. Don't go further |
| CORS | `Origin: https://evil.example` against API routes; reflect + credentials = high |
| Webhooks | Stripe/Razorpay/other: signature verification present? Replay protection? |
| Info leakage | Stack traces, verbose errors, `X-Powered-By`, source maps, `/_next/data` exposing private props, public `.env`/backup files |

For each confirmed issue, capture: request, response excerpt (redacted), and why it is a vulnerability.

### Phase 5: Domain, DNS and email (GoDaddy)

Read `references/domain-dns-godaddy.md`. The key checks are DNS records pointing correctly at Vercel, dangling CNAMEs (subdomain takeover), SPF/DKIM/DMARC to stop email spoofing of the user's domain, CAA, DNSSEC availability, registrar account hardening (2FA, domain lock, auto-renew, WHOIS privacy) and HSTS preload readiness.

### Phase 6: SEO-security

Read `references/seo-security.md`. Security and SEO overlap in a few high-value places: SEO spam/pharma hack injection, cloaking, hidden links, indexed admin/staging/preview URLs leaking data, `robots.txt` that advertises secret paths, sitemap containing private URLs, canonical/redirect hijack, malicious structured data, user-generated content spam (`rel="ugc nofollow"`), Google Search Console security issues, and Core Web Vitals regressions that come from security fixes (e.g. blocking CSP breaking analytics or fonts).

### Phase 7: Report

Produce `SECURITY_REPORT.md` from `assets/report_template.md`. Rules:
- Severity: **Critical / High / Medium / Low / Info**, with a one-line reason using impact x exploitability, not gut feel.
- Every finding: ID, title, location, evidence, impact, exact fix, effort (S/M/L), status.
- Lead with an executive summary of 5 lines or fewer: overall posture, top 3 risks, what was fixed already.
- Separate "confirmed" from "needs verification". Do not inflate unconfirmed findings.
- Include a "Not tested / out of scope" section so the user knows what the report does not cover.

### Phase 8: Remediation

Fix in this order: **Critical -> High -> quick-win Mediums -> rest**. For each fix:
1. Explain the change in one or two sentences and show the diff.
2. Apply on the security branch after approval.
3. Use the ready snippets in the reference files (security headers, middleware, RLS policies, rate limiting, zod validation, DMARC records) rather than inventing from scratch.
4. If the fix requires a dashboard action the agent cannot do (rotate Supabase keys, change GoDaddy DNS, enable 2FA, set Vercel env vars), give the user numbered click-by-click steps.

**Secret leaked? Treat as compromised.** Rotating is mandatory, removing it from code is not enough: rotate the key in Supabase/Vercel/provider, redeploy, then clean git history only if the user wants (`git filter-repo`), and check logs for misuse.

Roll out risky controls safely: ship CSP as `Content-Security-Policy-Report-Only` first, review violations for a few days, then enforce. Roll out RLS on a staging copy first, because a missing policy silently turns into "the app shows no data".

### Phase 9: Re-test and close

Re-run the same tests that found each issue and record PASS/FAIL in the report. Re-run `passive_recon.py` and compare against the first `recon.json`. Finish with a short "ongoing hygiene" list: Dependabot/Renovate, `npm audit` in CI, secret scanning in GitHub, Supabase security advisor and performance advisor review monthly, quarterly key rotation, Search Console alerts on, uptime and error monitoring.

## Using this in Antigravity

- Place this folder at `<workspace>/.agent/skills/webapp-security-audit/` (workspace scope) or in the global skills folder, then ask the agent for example: *"Use the webapp-security-audit skill to audit https://yourdomain.com. Repo is this workspace. Staging Supabase ref is xxxx."*
- Let the agent run scripts in the terminal and use the browser agent for Phase 4. Keep terminal approval on "request review" so you see each command that touches the network.
- Never paste real production secrets into the chat. Give the agent the anon key only; keep the service role key out of the workspace entirely.

## What this skill will not do

It does not write exploits, malware, credential-stuffing tools or anything that targets systems the user does not control. If asked to test a domain the user cannot show they own, decline and offer to review the user's own code and configuration instead.

## Bundled resources

- `scripts/passive_recon.py`: safe external checks (headers, cookies, TLS, DNS, exposed files, JWT-in-JS)
- `scripts/code_scan.sh`: repo secret and misconfiguration grep, `npm audit`
- `scripts/rls_audit.sql`: read-only Supabase RLS/grants/functions/storage audit
- `references/supabase-security.md`: RLS patterns, key handling, auth, storage, functions, fixes
- `references/nextjs-vercel-security.md`: Next.js and Vercel checklist with fix snippets
- `references/domain-dns-godaddy.md`: DNS, email auth, TLS, registrar hardening
- `references/seo-security.md`: SEO-related security checks and clean-up
- `assets/report_template.md`: report skeleton
