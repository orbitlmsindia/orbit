  # SaaS Permission Matrix & Authorization Middleware Setup

## Role Based Permission Matrix

| Feature \ Role           | Master Admin (super_admin) | College Admin (admin) | Teacher (teacher) | Student (student) |
| :---                     | :---                       | :---                  | :---              | :---              |
| **Data Scope**           | Cross-Tenant (Global)      | Single Tenant         | Single Tenant     | Single Tenant     |
| Tenant Provisioning      | ✅ Yes                      | ❌ No                 | ❌ No             | ❌ No             |
| Billing & Subscriptions  | ✅ Yes                      | ❌ No                 | ❌ No             | ❌ No             |
| Platform Analytics       | ✅ Yes                      | ❌ No                 | ❌ No             | ❌ No             |
| System Monitoring        | ✅ Yes                      | ❌ No                 | ❌ No             | ❌ No             |
| View All Colleges        | ✅ Yes                      | ❌ No                 | ❌ No             | ❌ No             |
| Manage College Admins    | ✅ Yes                      | ✅ Yes (own college)  | ❌ No             | ❌ No             |
| Manage Teachers/Users    | ✅ Yes                      | ✅ Yes                | ❌ No             | ❌ No             |
| View/Edit All Courses    | ✅ Yes                      | ✅ Yes                | ✅ Yes (own only) | ❌ No             |
| Enroll In Courses        | ❌ No                       | ❌ No                 | ❌ No             | ✅ Yes            |
| Submit Assignments       | ❌ No                       | ❌ No                 | ❌ No             | ✅ Yes            |

---

## API Authorization Middleware

The backend authorization flow utilizes **PostgreSQL Row Level Security (RLS)** as a natural database middleware to safely filter context per role without writing cumbersome API level data checks. To prevent recursion bugs and guarantee ultra-fast evaluation, credentials are baked directly into the user's JWT through custom Supabase Auth hooks.

### 1. The JWT Auth Hook (Role & Tenant Validation)
During login and token refresh, Supabase intercepts the token generation. The system embeds `college_id` and `user_role` directly inside PostgreSQL `app_metadata` JSON context using the secure `custom_access_token_hook`.

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
  -- Dynamically fetched securely upon token grant, completely hidden from HTTP UI
  SELECT role, college_id INTO user_role, user_college_id FROM public.users WHERE id = (event->>'user_id')::uuid;

  claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(user_role));
  claims := jsonb_set(claims, '{app_metadata, college_id}', to_jsonb(user_college_id));
  -- Returns embedded claims inside JWT payload
  RETURN event;
$$;
```

### 2. Auto-Isolation Middleware Layer (SELECT & UPDATE API)
Any database read/write request evaluates the JWT session payload transparently utilizing native SQL extraction helpers:

```sql
(college_id = public.get_college_id() OR public.get_user_role() = 'super_admin')
```
* **Effect:** A user can *ONLY* query rows mapped to their injected `college_id`. For Master Admins (`super_admin`), the database recognizes their omni-tenant role natively and bypasses restrictions via `OR ... = 'super_admin'`.

### 3. API Auto-Injection Middleware Layer (INSERT)
To prevent unauthorized users from spoofing JSON payloads with alternative `college_id` attributes, an automated backend payload sanitation algorithm (`BEFORE INSERT` Trigger) intercepts the API insertion:

```sql
CREATE OR REPLACE FUNCTION public.auto_inject_college_id()
RETURNS TRIGGER AS $$
BEGIN
    v_college_id := public.get_college_id();
    v_role := public.get_user_role();

    IF v_role != 'super_admin' AND v_college_id IS NOT NULL THEN
        NEW.college_id = v_college_id; -- Hard overrides any payload tenant spoofing
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
* **Effect:** Teachers/Admins cannot declare global ownership nor assign data to a different college. Master Admins legally bypass this protection since they provide custom `college_id` targets.

### 4. Authentication Flow Specifics
1. **Password Hashing:** Native managed internally using `pgcrypto`/`bcrypt` by the GoTrue auth server.
2. **Session Protection:** Tokens are cryptographically signed. `MasterLogin` interface explicitly zeroes out `sessionStorage.collegeId` internally to enforce global domain routing constraints within React, while the strict PostgreSQL engine strictly relies on valid signed JWT elements.
3. **Role Based Access:** Full CRUD access granted to `super_admin` in all sub-domains.
