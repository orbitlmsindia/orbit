# Supabase Security Reference

Contents: 1 Key model · 2 RLS patterns · 3 Testing RLS from outside · 4 Auth settings · 5 Storage · 6 Functions/RPC · 7 Edge Functions · 8 Next.js integration · 9 Fix recipes · 10 Logging

## 1. Key model (the most common source of critical findings)

| Key | Where it may live | Notes |
|---|---|---|
| `anon` / publishable key | Browser, `NEXT_PUBLIC_*` | Public by design. Safe **only** if RLS is correct everywhere |
| `service_role` / secret key | Server only (Vercel env var, not `NEXT_PUBLIC_`) | Bypasses ALL RLS. Never in client code, never in a git repo, never in an Antigravity workspace file |
| JWT secret | Supabase dashboard only | Leaking it lets an attacker mint any user token |
| DB connection string / password | Server only | Prefer pooled connection with a least-privilege role |

If a `service_role` or `sb_secret_` key was ever in client code, a public repo, a screenshot or a chat: **rotate it** (Dashboard > Project Settings > API keys / JWT keys), update Vercel env vars, redeploy. Then review logs for abuse.

Use the service role only in: server-only modules (`import 'server-only'`), cron/webhook handlers that have verified a signature, admin scripts run locally. Always check the *caller's* identity and permission **before** using it, since using it removes the database safety net.

## 2. RLS patterns

Baseline for every table in an exposed schema:

```sql
alter table public.todos enable row level security;
alter table public.todos force row level security;   -- applies to table owner too (not to service_role / BYPASSRLS roles)

-- owner-only access
create policy "todos_select_own" on public.todos for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy "todos_insert_own" on public.todos for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "todos_update_own" on public.todos for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );      -- WITH CHECK stops changing user_id to someone else
create policy "todos_delete_own" on public.todos for delete to authenticated
  using ( (select auth.uid()) = user_id );
```

Notes:
- Wrap `auth.uid()` as `(select auth.uid())`, since it makes Postgres cache it per statement (big performance win).
- Always specify `to authenticated` (or `to anon` deliberately). A policy with no role applies to `public`, which includes anon.
- Index the column used in policies (`user_id`).
- **Roles / admin**: store in a server-controlled place. Do NOT trust `user_metadata` (users can edit it). Use `app_metadata` (only service role writes it) or a `user_roles` table with no write policy for users:

```sql
create table public.user_roles (user_id uuid primary key references auth.users on delete cascade, role text not null check (role in ('user','admin')));
alter table public.user_roles enable row level security;
create policy "read own role" on public.user_roles for select to authenticated using ((select auth.uid()) = user_id);
-- no insert/update/delete policies => only service role can change roles

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin');
$$;
revoke execute on function public.is_admin() from anon, public;
```

- **Multi-tenant**: policy on `org_id in (select org_id from memberships where user_id = (select auth.uid()))`. Put membership lookup in a `security definer` function with pinned `search_path` to avoid recursive policy issues.
- **Public read, owner write** (blog, products): `for select to anon, authenticated using (published = true)` plus owner write policies.
- **Never** `using (true)` on a table with user data. For genuinely public reference tables it is acceptable for `select` only.
- **Sensitive columns** (e.g. `is_admin`, `stripe_customer_id`, `credits`): RLS is row-level, not column-level. Either move them to a separate table users cannot update, or revoke column privileges: `revoke update (credits) on public.profiles from authenticated;`, or use a trigger that rejects changes.
- Views: `alter view v set (security_invoker = true);` (Postgres 15+), otherwise the view bypasses RLS.

## 3. Testing RLS from the outside (proves the SQL matches reality)

Use only the anon key (public) and test-account JWTs. Replace `REF`, `ANON`, `JWT_A`.

```bash
# What can an anonymous visitor read? Repeat for every table name in the app.
curl -s "https://REF.supabase.co/rest/v1/profiles?select=*&limit=3" -H "apikey: ANON" -H "Authorization: Bearer ANON"

# Discover tables exposed via the OpenAPI document (requires only anon key)
curl -s "https://REF.supabase.co/rest/v1/" -H "apikey: ANON" | python3 -c "import sys,json;d=json.load(sys.stdin);print('\n'.join(sorted(d.get('paths',{}).keys())))"

# As user A, try to read/modify user B's row (expect [] or 401/403)
curl -s "https://REF.supabase.co/rest/v1/todos?user_id=eq.<B_UUID>" -H "apikey: ANON" -H "Authorization: Bearer JWT_A"
curl -s -X PATCH "https://REF.supabase.co/rest/v1/todos?id=eq.<B_ROW_ID>" -H "apikey: ANON" -H "Authorization: Bearer JWT_A" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"title":"audit-test"}'

# Privilege escalation attempt on own profile (expect failure)
curl -s -X PATCH "https://REF.supabase.co/rest/v1/profiles?id=eq.<A_UUID>" -H "apikey: ANON" -H "Authorization: Bearer JWT_A" -H "Content-Type: application/json" -d '{"role":"admin"}'

# Storage listing
curl -s -X POST "https://REF.supabase.co/storage/v1/object/list/BUCKET" -H "apikey: ANON" -H "Authorization: Bearer ANON" -H "Content-Type: application/json" -d '{"prefix":"","limit":5}'
```

Run write tests (PATCH/POST/DELETE) only against staging or rows that belong to your own test accounts. Record the request, status and body excerpt as evidence. Unexpected 200 with data = finding.

## 4. Auth settings checklist (Dashboard > Authentication)

- Email confirmation required (Providers > Email > Confirm email ON)
- Minimum password length 10+ and leaked-password protection ON (Pro plan feature; otherwise enforce in app)
- OTP / magic-link expiry short (default 3600s is okay; lower for sensitive apps)
- **URL Configuration**: Site URL = production domain; Redirect URLs = exact production URLs (+ specific preview URL patterns if needed). No `*` or `http://localhost` on production
- Disable signups if the app is invite-only; disable unused providers; anonymous sign-ins OFF unless needed
- Rate limits (Auth > Rate Limits): keep defaults or tighter; add CAPTCHA (Turnstile/hCaptcha) on signup/login/reset
- MFA (TOTP) for admin accounts; require `aal2` in admin policies
- JWT expiry 3600s or lower; refresh token reuse detection ON (default)
- Custom SMTP configured (the default shared SMTP is rate limited and for testing only), and SPF/DKIM/DMARC set up for the sender domain
- Email templates: no links to non-owned domains
- Error messages: login and reset should not reveal whether an email exists (Supabase password reset behaves safely; check custom code)

## 5. Storage

- Default to **private** buckets with signed URLs (`createSignedUrl`) of short expiry
- Public buckets only for truly public assets; set `file_size_limit` and `allowed_mime_types`
- Path-scoped policies: `(storage.foldername(name))[1] = (select auth.uid())::text`
- Do not serve user-uploaded HTML/SVG from your own origin inline (stored XSS). Use `Content-Disposition: attachment` or restrict MIME types; scan if needed
- Validate file type server-side, not only by extension

```sql
create policy "users manage own folder" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

## 6. Database functions / RPC

Every function in an exposed schema is callable at `/rest/v1/rpc/<name>`.
- Prefer `security invoker` (default). If `security definer` is needed: `set search_path = ''`, fully qualify objects, check `auth.uid()` inside, and `revoke execute ... from public, anon;` then `grant execute ... to authenticated;`
- Put purely internal functions in a non-exposed schema (e.g. `private`)
- Do not build SQL with string concatenation inside functions (`execute format(...)` must use `%I` / `%L` or `using` params)
- Triggers that set `user_id`, `created_by`, `updated_at` server-side are stronger than trusting the client

## 7. Edge Functions

- `verify_jwt = true` (default) unless it is a verified webhook receiver
- Webhooks: verify provider signature, check timestamp to prevent replay
- Secrets via `supabase secrets set`, not in code
- CORS: allow-list your origin, not `*`, if the function reads cookies/auth
- Validate input (zod) and cap body size

## 8. Next.js integration

- Use `@supabase/ssr` with cookie-based sessions. Server code: **`supabase.auth.getUser()`** (validates with Auth server) or `getClaims()` (verifies JWT signature) for authorization decisions. `getSession()` alone just reads the cookie and must not gate access on the server
- Create the server client per request (never a module-level singleton that holds one user's session)
- Never import the service-role client from a file that can be bundled into client components. Use `import 'server-only'` at the top of that module
- Do authorization twice: in the route/action AND in RLS. Middleware is a convenience, not the only barrier

## 9. Fix recipes (apply, then re-test)

| Finding | Fix |
|---|---|
| Table without RLS | `alter table ... enable row level security;` + policies. Test in staging first |
| `using (true)` write policy | Replace with ownership/role predicate; add `with check` |
| service_role in client | Rotate keys; move code to server-only; `import 'server-only'`; remove `NEXT_PUBLIC_` prefix |
| View bypasses RLS | `security_invoker = true` or revoke from anon/authenticated |
| Definer function open to anon | `revoke execute on function f(...) from anon, public;` pin search_path |
| Public bucket with private data | Set `public = false`, migrate to signed URLs |
| Role from `user_metadata` | Move to `app_metadata` / `user_roles` table |
| Mass-assignment via PATCH | Column revoke, trigger, or split table |
| Wildcard redirect URL | Replace with exact URLs |

## 10. Logging and monitoring

- Dashboard > Logs: look for repeated 401/403/429, unusual `rpc` calls, auth failures bursts, storage downloads spikes
- Enable log drains / alerts if on a plan that supports it
- Turn on `pgaudit` / audit-trigger tables for admin-sensitive tables
- Take regular backups; test restore (point-in-time recovery on paid plans)
- Review Security Advisor monthly; it flags many RLS issues automatically
