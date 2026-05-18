# 🔑 OrbitLMS — API Key Rotation Checklist

## Finding 7: JWT Expiry Year 2035

The currently active Supabase anon key was confirmed to have an expiry (`exp`) of
**2085591415 → approximately year 2035** — a 9-year window of exposure.

> **ACTION REQUIRED: Rotate the key immediately.**
> After rotation, all previously extracted keys become permanently invalid.

---

## Step-by-Step Rotation Guide

### Step 1 — Rotate the Key in Supabase Dashboard
1. Go to → [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your project: **`byfzhkceuzstttdshzgb`**
3. Navigate to: **Settings → API**
4. Under **"Project API Keys"**, click **"Regenerate"** next to the `anon` key
5. Confirm the rotation — the OLD key is **immediately invalidated**

### Step 2 — Update Your Local `.env` File
Replace the old `VITE_SUPABASE_ANON_KEY` in your `.env` file with the newly generated key:
```env
VITE_SUPABASE_URL=https://byfzhkceuzstttdshzgb.supabase.co
VITE_SUPABASE_ANON_KEY=<PASTE_YOUR_NEW_ANON_KEY_HERE>
```

> ⚠️ **Never commit your `.env` file to Git.** The `.env` is already in `.gitignore`.

### Step 3 — Update Netlify Environment Variables
Since OrbitLMS is deployed on Netlify, you must also update the key there:
1. Go to → [https://app.netlify.com](https://app.netlify.com)
2. Open the **OrbitLMS** site → **Site Settings → Environment Variables**
3. Find `VITE_SUPABASE_ANON_KEY` and update it with the new key
4. Trigger a **new deploy** so the fresh bundle embeds the new key

### Step 4 — Verify the Old Key Is Dead
Run this command with the OLD key — it should now return `401 Unauthorized`:
```bash
curl -H "apikey: OLD_KEY_HERE" \
     -H "Authorization: Bearer OLD_KEY_HERE" \
     "https://byfzhkceuzstttdshzgb.supabase.co/rest/v1/users?select=id&limit=1"
```
A `401` response confirms the old key is fully invalidated.

### Step 5 — Verify the New Key Works
Repeat the same curl command with the **new key** — it should return `200 OK` (or `403` if RLS is active, which is expected and correct).

---

## Key Rotation Policy (Ongoing Best Practice)

| Action | Frequency | Owner |
|---|---|---|
| Rotate `anon` key | Every 6 months | Project Admin |
| Rotate `service_role` key | Every 6–12 months | Project Admin |
| Audit Supabase access logs | Monthly | Project Admin |
| Review RLS policies | Quarterly | Developer |

---

## What Happens After Rotation?
- ✅ Any attacker holding the old key is **immediately locked out**
- ✅ The production app auto-reconnects using the new key via Netlify env vars
- ✅ Local development requires re-running the dev server (`npm run dev`) to pick up the new `.env`
- ✅ No database data or user accounts are affected — only the API key changes

---

> 📌 **Keep this checklist** and repeat Steps 1–5 every 6 months as a security hygiene practice.
