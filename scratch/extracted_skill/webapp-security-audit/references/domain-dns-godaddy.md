# Domain, DNS, Email and TLS Reference (GoDaddy + Vercel)

Contents: 1 Registrar account hardening · 2 DNS records for Vercel · 3 Subdomain takeover · 4 Email authentication (SPF/DKIM/DMARC) · 5 CAA, DNSSEC, TLS, HSTS · 6 Verification commands · 7 Remediation steps

## 1. GoDaddy account hardening (highest-impact, usually skipped)

A hijacked registrar account = attacker controls DNS, email and the whole site. Checklist (the agent cannot do these; give the user click-by-click steps):
- 2-step verification on the GoDaddy account (authenticator app, not SMS only); unique strong password in a password manager
- Domain **lock** ON (transfer lock) + registrar-lock if offered; **auto-renew** ON; payment method valid; renewal reminders go to an email the user actually reads
- Contact/admin email on the domain is on a domain **not** relying on the same domain (circular dependency) and has 2FA
- Domain privacy (WHOIS) ON
- Remove unknown delegates under "Delegate Access"; review login history
- Consider a Domain Protection / Ownership protection plan for business-critical domains
- Keep the authorization/EPP code private

## 2. DNS records for a Vercel deployment

Typical correct setup (verify the exact values shown in Vercel > Project > Settings > Domains, since Vercel may assign project-specific values):

| Host | Type | Value | Note |
|---|---|---|---|
| `@` | A | `76.76.21.21` (Vercel's standard apex IP; use the value Vercel displays) | apex |
| `www` | CNAME | `cname.vercel-dns.com` (or the project-specific target Vercel displays) | |

Review for:
- Leftover GoDaddy defaults: parked-page A record, "Websites + Marketing" forwarding, wildcard `*` records pointing to old hosts
- Duplicate/conflicting A/AAAA records (some visitors hit the old server). Remove stale AAAA
- Domain **forwarding** by GoDaddy for www->apex is fine but serves HTTP by default for some plans; prefer redirect configured in Vercel
- TXT records for verification of services no longer used (clean up; they reveal tool stack and can be abused)
- Nameservers: either keep GoDaddy DNS (simplest) or delegate to Vercel DNS; do not leave both partially configured

## 3. Subdomain takeover

Dangling DNS = attacker claims the target service and serves content on `sub.yourdomain.com` (steals cookies scoped to `.yourdomain.com`, phishing, SEO spam).
Check every CNAME/A in the zone:
```bash
dig +short CNAME sub.example.com
curl -sI https://sub.example.com | head -5      # look for "NoSuchBucket", "There isn't a GitHub Pages site here", "project not found", Vercel 404 DEPLOYMENT_NOT_FOUND, Heroku "no such app", Shopify/Fastly/Azure error pages
```
Fix: delete DNS records for decommissioned services; in Vercel remove unused domains; never keep a CNAME to a service you no longer control. Also avoid scoping auth cookies to the parent domain.

## 4. Email authentication (stops spoofing and protects deliverability and SEO reputation)

Even if the site sends no email, publish records saying so; attackers love to spoof domains with no DMARC.

**SPF** (one TXT record at `@`, only ONE `v=spf1` record, max 10 DNS lookups):
- Sends via Google Workspace: `v=spf1 include:_spf.google.com ~all`
- Sends via Microsoft 365: `v=spf1 include:spf.protection.outlook.com ~all`
- Plus transactional provider (Resend/SendGrid/Brevo/Supabase custom SMTP): add its `include:`
- No email at all: `v=spf1 -all`
- Move `~all` to `-all` when confident

**DKIM**: provider gives 1-3 CNAME/TXT records (e.g. `selector._domainkey`). Add exactly as provided. Test by sending to a mailbox and viewing headers `dkim=pass`

**DMARC** (TXT at `_dmarc`):
1. Week 1-2: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com; fo=1`
2. Then: `v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@yourdomain.com` -> raise pct to 100
3. Finally: `v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com; adkim=s; aspf=s`
Subdomain policy: `sp=reject` if subdomains don't send mail.

Also: MTA-STS and TLS-RPT (optional, advanced), BIMI (optional branding).

GoDaddy UI: My Products > Domain > DNS > Add New Record (TXT). Note GoDaddy auto-appends the domain, so enter host `_dmarc` not `_dmarc.example.com`, and paste TXT value without extra quotes.

## 5. CAA, DNSSEC, TLS, HSTS

- **CAA** restricts who can issue certificates. Vercel uses Let's Encrypt:
  `@ CAA 0 issue "letsencrypt.org"` (+ `0 issuewild "letsencrypt.org"` if wildcard; + `0 iodef "mailto:security@yourdomain.com"`). Add any other CA you use (e.g. Google Trust Services for other hosts). A wrong CAA blocks certificate renewal, so test on a subdomain first
- **DNSSEC**: protects against DNS spoofing. GoDaddy supports DNSSEC for domains using GoDaddy nameservers on supported TLDs (check Domain > DNS > DNSSEC). Enable only when the TLD and nameservers support it, because a broken DS record takes the domain offline
- **TLS**: Vercel manages certificates (auto-renew). Verify: TLS 1.2+ only, certificate covers apex + www, no mixed content. External check: SSL Labs (ssllabs.com/ssltest) for the grade
- **HSTS**: header set via Next config (see nextjs-vercel-security.md). Submit to hstspreload.org only after all subdomains are HTTPS-only
- Mixed content: grep for `http://` asset URLs; `upgrade-insecure-requests` in CSP helps

## 6. Verification commands

```bash
dig +short A example.com ; dig +short AAAA example.com ; dig +short CNAME www.example.com
dig +short NS example.com
dig +short TXT example.com                 # SPF
dig +short TXT _dmarc.example.com
dig +short CAA example.com
dig +short DS example.com                  # DNSSEC
dig +short MX example.com
curl -sI http://example.com | head -3      # expect 301/308 to https
curl -sI https://www.example.com | head -3 # expect consistent redirect to canonical host
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -dates -issuer -subject
```
Web tools the user can open: MXToolbox (SPF/DMARC/blacklist), dmarcian/EasyDMARC (DMARC check), SSL Labs, securityheaders.com, Mozilla Observatory, hstspreload.org check, Google Postmaster Tools, Google Safe Browsing site status (transparencyreport.google.com/safe-browsing/search).

## 7. Remediation steps template (for the report)

For each DNS/domain finding give: **Where** (GoDaddy > DNS > record type/host), **Exact value**, **How to verify** (the `dig` line), **Propagation note** (up to a few hours; TTL), **Rollback** (the old value).
