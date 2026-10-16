-- Supabase security audit: READ-ONLY queries. Safe to run in the SQL editor.
-- Run each block separately and review the rows. Every row returned is a lead.

-- 1. Tables in exposed schemas with RLS DISABLED  (CRITICAL if they hold data)
select n.nspname as schema, c.relname as table, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname in ('public')          -- add other schemas listed in Settings > API > Exposed schemas
  and not c.relrowsecurity
order by 1, 2;

-- 2. Tables with RLS enabled but ZERO policies (locks everyone out except service role; usually a bug)
select n.nspname as schema, c.relname as table
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where c.relkind = 'r' and n.nspname = 'public' and c.relrowsecurity
group by 1, 2
having count(p.policyname) = 0;

-- 3. Overly permissive policies (using/with check = true, or applied to anon/public)
select schemaname, tablename, policyname, cmd, roles, qual as using_expr, with_check
from pg_policies
where schemaname = 'public'
  and (
        qual = 'true' or with_check = 'true'
     or qual is null and cmd in ('SELECT','DELETE','UPDATE','ALL')
     or roles::text ~ '(anon|public)'
  )
order by tablename, cmd;

-- 4. Policies that trust user-editable metadata (raw_user_meta_data can be changed by the user!)
select schemaname, tablename, policyname, qual, with_check
from pg_policies
where coalesce(qual,'') ilike '%user_metadata%' or coalesce(with_check,'') ilike '%user_metadata%'
   or coalesce(qual,'') ilike '%raw_user_meta_data%' or coalesce(with_check,'') ilike '%raw_user_meta_data%';
-- Use app_metadata (server-controlled) or a roles table instead.

-- 5. UPDATE policies missing WITH CHECK (user may update a row to something they could not insert, e.g. change owner_id)
select schemaname, tablename, policyname, qual, with_check
from pg_policies
where schemaname = 'public' and cmd in ('UPDATE','ALL') and with_check is null;

-- 6. Views that bypass RLS (views run as owner unless security_invoker = true)
select n.nspname as schema, c.relname as view, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'v' and n.nspname = 'public'
  and not coalesce(c.reloptions::text, '') ilike '%security_invoker=true%';
-- Fix: alter view <name> set (security_invoker = true);  (Postgres 15+)

-- 7. SECURITY DEFINER functions in exposed schemas (run with owner's rights; callable via /rest/v1/rpc)
select n.nspname as schema, p.proname as function, pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer, p.proconfig as config,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authed_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by 1, 2;
-- Review: must validate auth.uid() inside, must `set search_path = ''` (or pinned schemas), revoke execute from anon/public if not needed.

-- 8. Functions WITHOUT a pinned search_path (search_path hijack risk)
select n.nspname, p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'));

-- 9. Table privileges granted to anon / authenticated (RLS is the guard; grants show the surface)
select table_schema, table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
group by 1,2,3
order by 2,3;
-- Sensitive tables (payments, admin, audit logs) should not grant anon anything. Consider: revoke all on table x from anon;

-- 10. Storage buckets: public ones are readable by ANYONE with the URL
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by public desc, name;
-- public + no size limit + no mime allow-list = high risk for uploads.

-- 11. Storage policies
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 12. Extensions in public schema / risky extensions
select e.extname, n.nspname as schema
from pg_extension e join pg_namespace n on n.oid = e.extnamespace
where n.nspname = 'public';
-- Move to the `extensions` schema.

-- 13. Realtime: tables published to supabase_realtime (their changes broadcast subject to RLS)
select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime';

-- 14. Users table sanity (counts only, no PII)
select count(*) as total_users,
       count(*) filter (where email_confirmed_at is null) as unconfirmed_users,
       count(*) filter (where raw_app_meta_data->>'role' is not null) as users_with_app_role,
       count(*) filter (where is_anonymous) as anonymous_users
from auth.users;

-- 15. Columns that look sensitive in exposed tables (consider moving to a private schema or separate RLS-protected table)
select table_schema, table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and column_name ~* '(password|passwd|secret|token|api_key|apikey|ssn|aadhaar|pan_number|card|cvv|otp|private)';

-- Also run in the Dashboard: Advisors > Security Advisor and Performance Advisor, and compare.
