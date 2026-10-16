#!/usr/bin/env bash
# Static, read-only scan of a Next.js + Supabase repo for common security mistakes.
# Usage: bash code_scan.sh [repo_path]
# Output is a triage list, not a verdict: review every hit by hand.

ROOT="${1:-.}"
cd "$ROOT" || { echo "Cannot cd to $ROOT"; exit 1; }

EXCL=(--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude-dir=dist --exclude-dir=build --exclude-dir=.vercel)
hr() { printf '\n=== %s ===\n' "$1"; }
g()  { grep -RInE "${EXCL[@]}" "$@" 2>/dev/null | cut -c1-220 | head -40; }

hr "1. Env files tracked by git (must be empty except .env.example)"
git ls-files 2>/dev/null | grep -E '(^|/)\.env' | grep -v '\.example$' || echo "none tracked"

hr "2. .gitignore covers env files?"
grep -qE '^\.env' .gitignore 2>/dev/null && echo "yes" || echo "WARNING: .env* not in .gitignore"

hr "3. service_role / secret key used in code (check it is server-only)"
g 'service_role|SERVICE_ROLE|sb_secret_|SUPABASE_SERVICE' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.mjs' --include='*.json' .

hr "4. Secrets exposed through NEXT_PUBLIC_ (these ship to every browser)"
g 'NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE|PRIVATE|PASSWORD|TOKEN|KEY)' .
echo "(NEXT_PUBLIC_SUPABASE_ANON_KEY / PUBLISHABLE_KEY and public analytics ids are expected)"

hr "5. Hard-coded credential patterns"
g '(sk_live_[0-9a-zA-Z]{16,}|AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{30,}|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.)' .

hr "6. Dangerous sinks"
g 'dangerouslySetInnerHTML|innerHTML\s*=|document\.write\(|eval\(|new Function\(' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' .

hr "7. Raw SQL / string-built queries"
g '(\.rpc\(|\$queryRawUnsafe|\.query\(\s*`|execute\(\s*`)' --include='*.ts' --include='*.tsx' --include='*.js' .

hr "8. Server-side fetch to user-controlled URL (SSRF candidates)"
g 'fetch\(\s*(req|request|params|searchParams|body|input|url|formData)' --include='*.ts' --include='*.tsx' --include='*.js' .

hr "9. Redirects from user input (open redirect candidates)"
g '(redirect|NextResponse\.redirect|router\.push)\(\s*(req|request|searchParams|params|next|returnTo|callbackUrl)' --include='*.ts' --include='*.tsx' .

hr "10. API route handlers and Server Actions (verify EACH has authn + authz)"
echo "-- route handlers:"
find . -type f \( -path '*/app/api/*/route.ts' -o -path '*/app/api/*/route.js' -o -path '*/app/*/route.ts' -o -path '*/pages/api/*' \) -not -path '*/node_modules/*' -not -path '*/.next/*' 2>/dev/null | head -60
echo "-- server actions files:"
grep -RIl "use server" "${EXCL[@]}" . 2>/dev/null | head -40
echo "-- handlers WITHOUT an obvious auth call (getUser|getSession|auth()|currentUser):"
for f in $(find . -type f \( -path '*/app/api/*/route.ts' -o -path '*/app/api/*/route.js' -o -path '*/pages/api/*' \) -not -path './node_modules/*' -not -path './.next/*' 2>/dev/null); do
  grep -qE 'getUser|getSession|auth\(\)|currentUser|verifyJwt|createServerClient|authorization' "$f" || echo "  CHECK: $f"
done

hr "11. getSession() on the server (trusts cookie, use getUser() / getClaims() for authz)"
g 'auth\.getSession\(' --include='*.ts' --include='*.tsx' .

hr "12. Middleware matcher (is it the only guard?)"
for f in middleware.ts middleware.js src/middleware.ts src/middleware.js proxy.ts src/proxy.ts; do [ -f "$f" ] && { echo "--- $f"; sed -n '1,80p' "$f"; }; done

hr "13. CORS / cookies / headers config"
g '(Access-Control-Allow-Origin|cors\(|httpOnly|sameSite|poweredByHeader|productionBrowserSourceMaps|Content-Security-Policy)' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.json' .

hr "14. next.config / vercel.json present?"
ls next.config.* vercel.json 2>/dev/null || echo "none found"

hr "15. Webhooks: signature verification present?"
g '(stripe-signature|constructEvent|x-razorpay-signature|svix|verifySignature|hmac)' --include='*.ts' --include='*.js' .
find . -type f -path '*webhook*' -not -path './node_modules/*' -not -path './.next/*' 2>/dev/null | head

hr "16. Dependencies"
if [ -f package.json ]; then
  echo "next version: $(node -p "(require('./package.json').dependencies||{}).next||'?'" 2>/dev/null)"
  echo "-- npm audit (production deps)"; npm audit --omit=dev 2>&1 | tail -25
else echo "no package.json"; fi

hr "17. Git history secret check (quick)"
git log --all --oneline -S'service_role' -- . 2>/dev/null | head -5
git log --all --diff-filter=D --name-only --pretty=format: 2>/dev/null | grep -E '\.env|\.pem|id_rsa' | sort -u | head
echo "If anything shows above, treat those secrets as compromised and rotate them."

echo; echo "Scan finished. Every hit above is a lead to verify, not a confirmed vulnerability."
