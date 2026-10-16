# Security Assessment Report: {{PROJECT}}

| | |
|---|---|
| Target | {{DOMAIN}} (Next.js on Vercel, Supabase `{{REF}}`, DNS at GoDaddy) |
| Date | {{DATE}} |
| Tester | Claude (webapp-security-audit skill), authorized by {{OWNER}} |
| Scope | {{IN_SCOPE}} |
| Out of scope | {{OUT_OF_SCOPE}} |
| Environment tested | {{PROD / STAGING / LOCAL}} |

## 1. Executive summary
- Overall posture: {{Good / Needs work / Poor}}
- Top 3 risks: {{1}}, {{2}}, {{3}}
- Findings: Critical {{n}} · High {{n}} · Medium {{n}} · Low {{n}} · Info {{n}}
- Already fixed in branch `security/audit-{{DATE}}`: {{n}} of {{total}}
- Needs owner action in dashboards (Supabase / Vercel / GoDaddy): {{n}}

## 2. Findings summary

| ID | Severity | Title | Area | Status |
|---|---|---|---|---|
| F-01 | Critical | | Supabase / Next.js / DNS / SEO | Open / Fixed / Verified |

Severity guide: **Critical** = data breach, account takeover or full DB access with low effort. **High** = serious but needs a precondition. **Medium** = limited impact or hard to exploit. **Low** = hardening gap. **Info** = observation.

## 3. Detailed findings

### F-01: {{Title}}
- **Severity:** {{Critical}}, because {{impact x exploitability in one line}}
- **Status:** Confirmed / Needs verification
- **Location:** {{URL, file:line, table, DNS record}}
- **Evidence:** 
  ```
  {{request/response or code excerpt, secrets redacted to first 6 chars}}
  ```
- **Impact:** {{what an attacker can do}}
- **Fix:** {{exact change, diff or dashboard steps}}
- **Effort:** S / M / L
- **Re-test:** {{command/test}} -> {{PASS / FAIL, date}}

(repeat per finding)

## 4. What was tested
| Phase | Done | Notes |
|---|---|---|
| Passive recon (headers, TLS, DNS, exposed files, JS secrets) | | |
| Static code review | | |
| Supabase RLS / auth / storage / functions | | |
| Dynamic testing (access control, injection, CSRF, SSRF, rate limits) | | |
| Domain / email authentication | | |
| SEO-security | | |

## 5. Not tested / limitations
{{e.g. production write tests skipped, no admin account supplied, third-party widgets, mobile apps, social engineering, physical security}}

## 6. Remediation roadmap
1. **Today:** {{criticals, key rotation}}
2. **This week:** {{highs, RLS, auth settings, headers in Report-Only}}
3. **This month:** {{mediums, CSP enforce, DMARC to reject, rate limiting, CI scanning}}
4. **Ongoing:** Dependabot, `npm audit` in CI, secret scanning, monthly Supabase advisors review, quarterly key rotation, Search Console alerts, re-run this audit after major releases

## 7. Re-test results (after fixes)
| ID | Before | After | Verified by |
|---|---|---|---|

## Appendix
- `recon.json` (before) and `recon-after.json` (after)
- Commands run, tool versions
