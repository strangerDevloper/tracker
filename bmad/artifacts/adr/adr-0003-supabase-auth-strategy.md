# ADR-0003: Supabase Auth with Google OAuth + Magic Link + Email/Password

**Status:** Accepted
**Date:** 2026-04-24
**Deciders:** Winston (Architect), Tushar (Owner)

---

## Context

Epic 01 requires three login methods to coexist. The user wants flexibility: Google for convenience, magic link for no-password UX, and email/password as a fallback. The choice of auth provider also affects how Row-Level Security integrates with Postgres.

Forces at play:
- Supabase is already chosen for DB/storage.
- RLS relies on `auth.uid()` — the auth source must populate this.
- Solo app; no need for enterprise SSO.
- Future v2: WhatsApp bot must be able to identify the same user (phone-number mapping will be added later).

---

## Options considered

### 1. Supabase Auth (native)
- ✅ Native `auth.uid()` integration with Postgres RLS — no custom glue.
- ✅ All three methods (Google, magic link, password) supported out of the box.
- ✅ Session management via cookies with `@supabase/ssr` — works cleanly with Next.js App Router.
- ✅ Password reset, email confirmation handled.
- ⚠️ Default transactional email is basic — we replace SMTP with Resend for custom templates.
- ⚠️ Rate limits on free tier are modest (fine for solo).

### 2. NextAuth (Auth.js) v5
- ✅ Feature-rich; many providers.
- ❌ Doesn't populate `auth.uid()` in Postgres — would need a trigger that links NextAuth sessions to a shadow `auth.users` table, adding complexity.
- ❌ Two sources of truth for identity (NextAuth + Supabase `auth`).
- ❌ For a Supabase-native stack, NextAuth is swimming upstream.

### 3. Clerk
- ✅ Excellent UX out of the box, great dev experience.
- ❌ Paid past 10,000 MAU (irrelevant for solo, but principle).
- ❌ Another vendor + another identity source → same RLS glue problem as NextAuth.
- ❌ Vendor lock-in; data portability weak.

### 4. Roll-our-own with cookies + bcrypt
- ❌ Not writing an auth system in 2026. Moving on.

---

## Decision

**We will use Supabase Auth, enabling Google OAuth, Magic Link, and Email/Password providers simultaneously.**

---

## Rationale

1. **RLS is our defense-in-depth.** Every table has `user_id` and policies using `auth.uid()`. Supabase Auth is the only option that populates this without glue. Integrating NextAuth/Clerk with Supabase would require a trigger syncing external auth to a local `auth.users` row — fragile and a bug magnet.

2. **Three-method support is native.** Enabling Google requires a provider config + redirect URL. Magic link and password are built-in. No dance.

3. **Session handling with Next.js App Router is solved.** `@supabase/ssr` provides `createServerClient` (RSC) + `createBrowserClient` (client) that share cookies correctly. Pattern is documented; don't invent.

4. **One vendor.** DB, Auth, Storage all in Supabase = one dashboard, one billing, one support channel.

5. **WhatsApp v2 identity mapping is manageable.** We'll add a `user_phone` table linking a phone number to a Supabase user. Since Supabase Auth is the canonical identity, the mapping is a single join away.

### Trade-offs knowingly accepted
- Custom email templates require SMTP override (Resend). Configured once; no ongoing cost.
- If Supabase ever dies, migrating auth is painful — but so would any other choice. This is a platform bet we accept.

---

## Configuration details

### Enabled providers
- Google OAuth (via Supabase dashboard → Providers → Google)
- Magic Link (enabled by default)
- Email/Password (enabled by default, with "confirm email" turned on)

### Redirect URLs
- Dev: `http://localhost:3000/api/auth/callback`
- Prod: `https://{domain}/api/auth/callback`

### Session handling
- Cookies set by `@supabase/ssr`: `sb-access-token`, `sb-refresh-token`.
- Middleware refreshes tokens server-side when the access token is stale.

### First-login shadow row
`/api/auth/callback` upserts into `public.users` with the same `id` as `auth.users.id`. All our RLS policies join on `public.users.id = auth.uid()`, so the mirror table stays aligned.

### Email templates
Default Supabase templates for email verification + magic link → replaced with Resend-based custom templates in Epic 01 Story 01.2.

---

## Consequences

- ✅ RLS enforcement is trivial to write.
- ✅ One auth vendor aligned with the rest of the stack.
- ✅ All three login methods supported.
- ⚠️ Free tier limits (e.g., 50 emails/hour) → upgrade before launch if cutting close.
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS; must be used only in cron/admin code, never in user-facing requests.
- 🔁 Reversibility: migrating off Supabase Auth is painful (user records + sessions). Platform bet accepted.

---

## References

- [Supabase Auth with Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [@supabase/ssr](https://www.npmjs.com/package/@supabase/ssr)
- Epic 01 (Foundation & Auth)
