#!/usr/bin/env python3
"""
Passive, read-only external security checks for a site YOU OWN.

Usage:
    python3 passive_recon.py https://example.com [--out recon.json] [--no-js]

Only sends ordinary GET/HEAD requests (a few dozen at most). No payloads,
no brute force. Standard library only; uses `dig` if available for DNS.
"""
import argparse
import base64
import json
import re
import shutil
import socket
import ssl
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

UA = "webapp-security-audit/1.0 (owner-authorized passive check)"
findings = []


def add(sev, title, detail="", fix=""):
    findings.append({"severity": sev, "title": title, "detail": detail, "fix": fix})


def fetch(url, method="GET", headers=None, timeout=12, follow=True):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": UA, **(headers or {})})
    opener = urllib.request.build_opener()
    if not follow:
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *a, **k):
                return None
        opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(req, timeout=timeout) as r:
            return r.status, dict(r.headers), r.read(2_000_000), r.headers
    except urllib.error.HTTPError as e:
        try:
            body = e.read(200_000)
        except Exception:
            body = b""
        return e.code, dict(e.headers or {}), body, e.headers
    except Exception as e:  # network error
        return None, {}, str(e).encode(), None


def check_https_redirect(host):
    status, hdrs, _, _ = fetch(f"http://{host}/", follow=False)
    if status is None:
        add("Info", "HTTP (port 80) not reachable")
        return
    loc = hdrs.get("Location", "")
    if status in (301, 302, 307, 308) and loc.startswith("https://"):
        if status in (302, 307):
            add("Low", f"HTTP->HTTPS redirect uses temporary {status}", "Prefer 301/308.", "Vercel normally does 308; check custom redirects.")
    else:
        add("High", "HTTP does not redirect to HTTPS", f"Status {status}, Location: {loc}", "Force HTTPS (Vercel does this by default; check domain config).")


def check_headers(hdrs):
    h = {k.lower(): v for k, v in hdrs.items()}
    expect = {
        "strict-transport-security": ("Medium", "Missing HSTS", "Add Strict-Transport-Security: max-age=63072000; includeSubDomains; preload"),
        "content-security-policy": ("Medium", "Missing Content-Security-Policy", "Add a CSP (start in Report-Only). See references/nextjs-vercel-security.md"),
        "x-content-type-options": ("Low", "Missing X-Content-Type-Options", "Add X-Content-Type-Options: nosniff"),
        "referrer-policy": ("Low", "Missing Referrer-Policy", "Add Referrer-Policy: strict-origin-when-cross-origin"),
        "permissions-policy": ("Low", "Missing Permissions-Policy", "Add Permissions-Policy: camera=(), microphone=(), geolocation=()"),
    }
    for key, (sev, title, fix) in expect.items():
        if key not in h:
            add(sev, title, fix=fix)
    if "x-frame-options" not in h and "frame-ancestors" not in h.get("content-security-policy", ""):
        add("Medium", "Clickjacking protection missing", "No X-Frame-Options and no CSP frame-ancestors.", "Add frame-ancestors 'none' (or 'self') in CSP and X-Frame-Options: DENY.")
    hsts = h.get("strict-transport-security", "")
    m = re.search(r"max-age=(\d+)", hsts)
    if m and int(m.group(1)) < 15552000:
        add("Low", "HSTS max-age is short", hsts, "Use at least 6 months, ideally 2 years.")
    csp = h.get("content-security-policy", "")
    if csp and "'unsafe-eval'" in csp:
        add("Low", "CSP allows 'unsafe-eval'", csp[:200], "Remove unless a dependency truly needs it (Next.js dev mode only).")
    if csp and re.search(r"script-src[^;]*'unsafe-inline'", csp) and "nonce-" not in csp:
        add("Medium", "CSP script-src allows 'unsafe-inline' without nonce", csp[:200], "Use nonces via middleware.")
    for leak in ("x-powered-by", "server"):
        if leak in h and leak == "x-powered-by":
            add("Low", "X-Powered-By header exposed", h[leak], "Set poweredByHeader: false in next.config.js")
    if h.get("access-control-allow-origin") == "*" and h.get("access-control-allow-credentials", "").lower() == "true":
        add("High", "CORS wildcard with credentials", "", "Never combine * with credentials.")


def check_cookies(raw_headers):
    if raw_headers is None:
        return
    for c in raw_headers.get_all("Set-Cookie") or []:
        name = c.split("=", 1)[0]
        low = c.lower()
        problems = []
        if "secure" not in low:
            problems.append("no Secure")
        if "httponly" not in low:
            problems.append("no HttpOnly")
        if "samesite" not in low:
            problems.append("no SameSite")
        if problems:
            sev = "Medium" if ("auth" in name.lower() or "session" in name.lower() or "sb-" in name.lower()) else "Low"
            add(sev, f"Cookie '{name}' weak flags: {', '.join(problems)}", "", "Set Secure; HttpOnly; SameSite=Lax (Supabase SSR auth cookies must stay readable by the client SDK if you use the browser client; weigh that).")


def check_cors(base):
    status, hdrs, _, _ = fetch(base + "/api", headers={"Origin": "https://evil.example"})
    h = {k.lower(): v for k, v in hdrs.items()}
    acao = h.get("access-control-allow-origin", "")
    if acao == "https://evil.example":
        sev = "High" if h.get("access-control-allow-credentials", "").lower() == "true" else "Medium"
        add(sev, "CORS reflects arbitrary Origin on /api", f"ACAO: {acao}", "Allow-list exact origins.")


def check_tls(host):
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((host, 443), timeout=10) as s:
            with ctx.wrap_socket(s, server_hostname=host) as ss:
                cert = ss.getpeercert()
                ver = ss.version()
        exp = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
        days = (exp - datetime.now(timezone.utc)).days
        if days < 0:
            add("Critical", "TLS certificate expired", str(exp))
        elif days < 14:
            add("Medium", f"TLS certificate expires in {days} days", "", "Vercel auto-renews; check DNS/CAA is not blocking renewal.")
        if ver in ("TLSv1", "TLSv1.1"):
            add("High", f"Weak TLS version negotiated: {ver}")
    except ssl.SSLCertVerificationError as e:
        add("High", "TLS certificate verification failed", str(e), "Fix domain/cert binding in Vercel.")
    except Exception as e:
        add("Info", "TLS check skipped", str(e))


def dig(name, rtype):
    if not shutil.which("dig"):
        return None
    try:
        out = subprocess.run(["dig", "+short", rtype, name], capture_output=True, text=True, timeout=10).stdout
        return [l.strip() for l in out.splitlines() if l.strip()]
    except Exception:
        return None


def check_dns(domain):
    apex = ".".join(domain.split(".")[-2:]) if domain.count(".") >= 1 else domain
    txt = dig(apex, "TXT")
    if txt is None:
        add("Info", "DNS checks skipped (dig not installed)", "", "Install dnsutils or run checks manually.")
        return
    spf = [t for t in txt if "v=spf1" in t]
    if not spf:
        add("Medium", f"No SPF record on {apex}", "", "Add v=spf1 include:<your mail provider> -all (or ~all while testing). If the domain sends no mail: v=spf1 -all")
    elif any(t.strip('"').endswith("+all") for t in spf):
        add("High", "SPF ends with +all (anyone can send)", " ".join(spf))
    dmarc = dig(f"_dmarc.{apex}", "TXT") or []
    if not dmarc:
        add("Medium", f"No DMARC record on _dmarc.{apex}", "", "Start with v=DMARC1; p=none; rua=mailto:you@domain, then move to quarantine and reject.")
    elif any("p=none" in d for d in dmarc):
        add("Low", "DMARC policy is p=none (monitor only)", " ".join(dmarc), "Move to p=quarantine then p=reject after reviewing reports.")
    caa = dig(apex, "CAA")
    if not caa:
        add("Low", "No CAA record", "", "Add CAA 0 issue \"letsencrypt.org\" (Vercel uses Let's Encrypt) to restrict certificate issuance.")
    ds = dig(apex, "DS")
    if not ds:
        add("Info", "DNSSEC not enabled (no DS record)", "", "Optional hardening; check GoDaddy DNSSEC support for your plan.")
    cname = dig(f"www.{apex}", "CNAME")
    if cname:
        for c in cname:
            if c.rstrip(".").endswith("vercel-dns.com") is False and "vercel" not in c:
                add("Info", f"www CNAME points to {c}", "", "Confirm this is intentional.")


def check_exposed(base):
    paths = {
        "/.env": "Critical", "/.env.local": "Critical", "/.env.production": "Critical",
        "/.git/HEAD": "Critical", "/.git/config": "Critical", "/package.json": "Low",
        "/.DS_Store": "Low", "/backup.zip": "High", "/db.sql": "Critical",
        "/.vercel/project.json": "Medium", "/api/debug": "Medium", "/api/health": None,
        "/admin": None, "/_next/static/../../.env": None,
    }
    for p, sev in paths.items():
        if sev is None:
            continue
        status, hdrs, body, _ = fetch(base + p)
        ctype = hdrs.get("Content-Type", "")
        if status == 200 and "text/html" not in ctype:
            sample = body[:80].decode("utf-8", "ignore").replace("\n", " ")
            # confirm it looks like what we expect, avoid false positives on catch-all routes
            if p.startswith("/.git") and "ref:" not in sample and "[core]" not in sample:
                continue
            if p.startswith("/.env") and "=" not in sample:
                continue
            add(sev, f"Exposed file: {p}", f"HTTP 200, content-type {ctype}", "Remove the file from the deploy / block the path; rotate any secrets inside.")
    for p in ("/security.txt", "/.well-known/security.txt"):
        s, _, _, _ = fetch(base + p)
        if s == 200:
            break
    else:
        add("Info", "No security.txt", "", "Add /.well-known/security.txt with a contact address (RFC 9116).")


def check_robots_sitemap(base):
    s, _, body, _ = fetch(base + "/robots.txt")
    if s == 200:
        txt = body.decode("utf-8", "ignore")
        sensitive = [l for l in txt.splitlines() if l.lower().startswith("disallow:") and re.search(r"admin|backup|private|internal|secret|staging|\.sql|dashboard|api/", l, re.I)]
        if sensitive:
            add("Low", "robots.txt advertises sensitive paths", "; ".join(sensitive[:6]), "robots.txt is public and not access control. Protect with auth and use noindex headers; avoid listing secret paths.")
        if re.search(r"^Disallow:\s*/\s*$", txt, re.M) and "vercel.app" not in base:
            add("Medium", "robots.txt disallows the whole site", "", "Fine for staging; on production this removes the site from search.")
    else:
        add("Info", "No robots.txt", "", "Add app/robots.ts")
    s, _, body, _ = fetch(base + "/sitemap.xml")
    if s == 200:
        urls = re.findall(r"<loc>([^<]+)</loc>", body.decode("utf-8", "ignore"))
        bad = [u for u in urls if re.search(r"admin|staging|preview|localhost|\.vercel\.app|dashboard|private", u, re.I)]
        if bad:
            add("Medium", "sitemap.xml lists private/staging-looking URLs", "; ".join(bad[:5]), "Remove them from the sitemap and add noindex.")
    else:
        add("Info", "No sitemap.xml", "", "Add app/sitemap.ts")


JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}")
SB_SECRET_RE = re.compile(r"sb_secret_[A-Za-z0-9_-]{16,}")


def b64json(seg):
    seg += "=" * (-len(seg) % 4)
    return json.loads(base64.urlsafe_b64decode(seg))


def scan_js_for_secrets(base, html):
    srcs = set(re.findall(r'src="(/_next/static/[^"]+\.js)"', html))
    srcs |= set(re.findall(r'"(/_next/static/chunks/[^"]+\.js)"', html))
    texts = [("homepage HTML", html)]
    for s in list(srcs)[:40]:
        st, _, body, _ = fetch(base + s)
        if st == 200:
            texts.append((s, body.decode("utf-8", "ignore")))
            if body[-200:].decode("utf-8", "ignore").find("sourceMappingURL") != -1:
                m = re.search(r"sourceMappingURL=([^\s*]+)", body[-300:].decode("utf-8", "ignore"))
                if m:
                    ms, _, _, _ = fetch(base + s + ".map", method="HEAD")
                    if ms == 200:
                        add("Medium", f"Source map publicly served: {s}.map", "", "Set productionBrowserSourceMaps: false (default) and remove uploaded maps.")
    seen = set()
    for where, t in texts:
        for tok in JWT_RE.findall(t):
            if tok in seen:
                continue
            seen.add(tok)
            try:
                payload = b64json(tok.split(".")[1])
            except Exception:
                continue
            role = payload.get("role")
            redacted = tok[:8] + "..."
            if role == "service_role":
                add("Critical", "Supabase service_role key shipped to the browser", f"Found in {where} ({redacted}). Full DB access bypassing RLS.", "ROTATE the JWT secret/keys in Supabase now, remove from client code and NEXT_PUBLIC_* vars, redeploy.")
            elif role == "anon":
                add("Info", "Supabase anon key present in client bundle (expected)", f"{where} ({redacted}), project ref: {payload.get('ref')}", "Safe only if every table has RLS. Run scripts/rls_audit.sql.")
        for m in SB_SECRET_RE.findall(t):
            add("Critical", "Supabase secret API key (sb_secret_...) in client bundle", f"{where} ({m[:12]}...)", "Rotate immediately; server-side only.")
        for pat, name in ((r"AKIA[0-9A-Z]{16}", "AWS access key id"), (r"sk_live_[0-9a-zA-Z]{20,}", "Stripe live secret key"), (r"AIza[0-9A-Za-z_\-]{35}", "Google API key (check restrictions)"), (r"ghp_[0-9A-Za-z]{36}", "GitHub token")):
            for m in set(re.findall(pat, t)):
                sev = "Low" if name.startswith("Google") else "Critical"
                add(sev, f"{name} in client bundle", f"{where} ({m[:8]}...)", "Rotate/restrict; move to server-side env var.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--out", default="recon.json")
    ap.add_argument("--no-js", action="store_true", help="skip JS bundle secret scan")
    a = ap.parse_args()
    u = urllib.parse.urlparse(a.url if "://" in a.url else "https://" + a.url)
    base = f"{u.scheme}://{u.netloc}"
    host = u.hostname
    print(f"[*] Passive checks on {base} (owner-authorized use only)")

    check_https_redirect(host)
    status, hdrs, body, raw = fetch(base + "/")
    if status is None:
        print("[!] Could not reach site:", body.decode())
        sys.exit(1)
    check_headers(hdrs)
    check_cookies(raw)
    check_cors(base)
    check_tls(host)
    check_dns(host)
    check_exposed(base)
    check_robots_sitemap(base)
    if not a.no_js:
        scan_js_for_secrets(base, body.decode("utf-8", "ignore"))

    order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3, "Info": 4}
    findings.sort(key=lambda f: order[f["severity"]])
    with open(a.out, "w") as f:
        json.dump({"target": base, "time": datetime.now(timezone.utc).isoformat(), "findings": findings}, f, indent=2)
    print(f"\n{'SEV':9} FINDING")
    for f in findings:
        print(f"{f['severity']:9} {f['title']}")
        if f["detail"]:
            print(f"{'':9}   > {f['detail'][:160]}")
    counts = {k: sum(1 for f in findings if f["severity"] == k) for k in order}
    print("\nSummary:", counts, f"\nSaved to {a.out}")


if __name__ == "__main__":
    main()
