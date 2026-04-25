# Epic 01 — Foundation & Authentication

**Status:** drafted
**Owner:** Tushar (solo dev)
**Depends on:** (none — this is the foundation)
**Unblocks:** all subsequent epics
**Estimated duration:** ~1 week (+ ~½ day for Story 01.0 bootstrap added 2026-04-24)

---

## Why this epic exists

Every feature in the app depends on identifying "who is logged in." Until auth works, nothing else can be built safely — we'd have to refactor every query later to scope by `user_id`. Shipping auth first lets every subsequent epic assume a known user context and lets us enable Supabase Row-Level Security from day 1, which is our primary data-isolation guarantee.

This epic also establishes the **application shell** — the layout, navigation, and route protection that every other screen lives inside.

---

## Scope — in

- Signup / login via **Google OAuth** (Supabase provider).
- Signup / login via **magic link** (email only, no password).
- Signup / login via **email + password**.
- Login UI showing all three methods with a clear primary (Google) and secondary options.
- Session management (persisted, renewable, secure cookies).
- Route protection middleware for all `(finance)` routes.
- First-login upsert into `public.users` table with default `user_settings`.
- Logout.
- Basic `/settings` page with profile + "delete account" (dangerous button, confirmation required).
- Supabase **Row-Level Security** policies applied to every table in v1 schema.

## Scope — out

- ❌ Multi-factor authentication (v2 — low personal-risk priority).
- ❌ Account recovery beyond Supabase defaults (password reset email only).
- ❌ OAuth providers other than Google (Apple, GitHub — not needed for solo use).
- ❌ Session sharing across devices with explicit management UI.
- ❌ Admin / impersonation features.

---

## User stories

### Story 01.0 — Project bootstrap
**As a** developer
**I want** a conventional Next.js 15 App Router scaffold with TS strict, Tailwind, Prisma, shadcn/ui, design tokens, and a test harness arranged per ADR-0008
**So that** every subsequent Epic 01+ story can focus on feature work, not setup.

**Acceptance criteria:** (full list in `stories/01.0-project-bootstrap.md`)
- [ ] AC-1: `npm run dev` boots; `/` renders a placeholder landing without errors.
- [ ] AC-2: `lint`, `typecheck`, `test`, `test:e2e` all exit 0 on the empty scaffold.
- [ ] AC-3: `prisma validate` + `generate` succeed against an empty schema with `DATABASE_URL` + `DIRECT_URL` wired.
- [ ] AC-4: shadcn/ui initialized + design tokens from front-end-spec §3 wired in `globals.css` + `tailwind.config.ts`.
- [ ] AC-5: Sonner `<Toaster />` mounted in root layout.
- [ ] AC-6: Folder structure matches ADR-0008 (empty folders carry `.gitkeep`).
- [ ] AC-7: ESLint enforces `lib/finance/*` purity rule from ADR-0008.
- [ ] AC-8: `.env.example` enumerates every var from architecture.md §7.
- [ ] AC-9: Single `chore: bootstrap Next.js project (Story 01.0)` commit on `main`; `.gitignore` correct.
- [ ] AC-10: README has Getting Started + stub Supabase-setup section for 01.1 to fill in.

**Dependencies:** none
**Status:** ready
**Readiness notes (PO):** Marked ready 2026-04-24 by Sarah. AC-3 + bootstrap step 6 refined during review to clarify that Prisma's CLI loads env vars from `.env` (not `.env.local`), so a gitignored `.env` with placeholder values must exist for `prisma generate` to run offline. Accepted risks: ESLint rule verified once then fixture deleted (no CI regression catch); Toaster proof is manual-visual. Full attestation in `stories/01.0-project-bootstrap.md`.
**Why this exists:** Inserted 2026-04-24 after James flagged that Story 01.1 presupposed a Next.js scaffold that did not exist. Splitting bootstrap out keeps 01.1 a pure auth story. See `stories/01.0-project-bootstrap.md` and `stories/01.1-google-oauth-signup.md` Dev notes (2026-04-24, James).

### Story 01.1 — Google OAuth sign-in
**As a** user
**I want** to sign in with my Google account
**So that** I don't have to create and remember another password.

**Acceptance criteria:**
- [ ] AC-1: Clicking "Sign in with Google" initiates the Supabase OAuth flow and redirects to Google.
- [ ] AC-2: After consent, I land back on the app's dashboard (authenticated).
- [ ] AC-3: A row is upserted in `public.users` with `id = auth.users.id` (the Supabase-issued uuid — **explicitly set, not Prisma-defaulted**), `email`, `name`, `auth_provider='google'`, `created_at`. See alignment-2026-04-24.md Conflict #3.
- [ ] AC-4: `user_settings` row is created with defaults (currency=INR, fy_start_month=4, timezone=Asia/Kolkata).
- [ ] AC-5: A subsequent visit while session is valid goes directly to dashboard, not to login.
- [ ] AC-6: Integration test: after OAuth signup, `SELECT id FROM public.users` returns the same uuid as `auth.uid()` in a Postgres session — this proves RLS will work in Story 01.5.

**Dependencies:** 01.0 (bootstrap — added 2026-04-24)
**Status:** needs-changes (paused 2026-04-24 pending 01.0; story body otherwise still ready — will flip back to `ready` once 01.0 ships)
**Readiness notes (PO):** Marked ready 2026-04-24 by Sarah. Bob — the id-mirroring pattern is the single most important thing in this story's context. Do not let Prisma default a uuid; `User.id` has no `@default` and must be set from `auth.users.id` on upsert.

### Story 01.2 — Magic link sign-in
**As a** user
**I want** to sign in via an email link
**So that** I don't need a Google account or a password.

**Acceptance criteria:**
- [ ] AC-1: Entering a valid email and clicking "Send magic link" triggers a Supabase email.
- [ ] AC-2: The email contains a working one-time link that authenticates me on click.
- [ ] AC-3: The link expires after a reasonable window (Supabase default — document it).
- [ ] AC-4: If the email doesn't exist in `auth.users`, a new user is created on link click (same upsert as 01.1).
- [ ] AC-5: Rate-limiting behavior is user-friendly (clear message, not silent failure).

**Dependencies:** 01.1 (shared user-upsert logic)
**Status:** drafted

### Story 01.3 — Email + password sign-in
**As a** user
**I want** to sign in with email and password
**So that** I have an offline-friendly, Google-free option.

**Acceptance criteria:**
- [ ] AC-1: Signup form validates email format and password strength (min 8 chars, mixed).
- [ ] AC-2: Login form allows email + password, with clear error on wrong credentials.
- [ ] AC-3: "Forgot password" link triggers Supabase password-reset email.
- [ ] AC-4: Reset link opens a change-password page, validates, logs me in.
- [ ] AC-5: First-time password signup upserts `public.users` with `auth_provider='email'`.

**Dependencies:** 01.1
**Status:** drafted

### Story 01.4 — Route protection middleware
**As a** developer
**I want** all `(finance)` routes to redirect unauthenticated users to /login
**So that** no UI or API accidentally leaks data.

**Acceptance criteria:**
- [ ] AC-1: `middleware.ts` intercepts requests to `/(finance)/*` and redirects to `/login` if no valid session.
- [ ] AC-2: Authenticated users visiting `/login` are redirected to dashboard.
- [ ] AC-3: API routes under `/api/*` return 401 JSON for unauthenticated requests.
- [ ] AC-4: Public routes (landing, login, `/api/auth/*`) are explicitly allowed.

**Dependencies:** 01.1
**Status:** drafted

### Story 01.5 — Row-Level Security for v1 schema
**As a** user
**I want** to be certain my data cannot be read by another user even if a bug exposes an endpoint
**So that** my financial data has defense-in-depth.

**Acceptance criteria:**
- [ ] AC-1: RLS is enabled on every table in the v1 schema.
- [ ] AC-2: Each table has a policy `user_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE where applicable.
- [ ] AC-3: A manual pen-test (impersonate another `user_id` in a raw query) returns zero rows.
- [ ] AC-4: Policies are in a Prisma migration, not applied manually via the dashboard.

**Dependencies:** 01.1 (needs auth.uid context)
**Status:** drafted

### Story 01.6 — App shell (layout, nav, logout)
**As a** user
**I want** consistent navigation and a visible logout option
**So that** I can move between sections and sign out safely.

**Acceptance criteria:**
- [ ] AC-1: Mobile: bottom tab nav with Dashboard / Transactions / Investments / Budgets / Settings.
- [ ] AC-2: Desktop: left sidebar nav with same sections.
- [ ] AC-3: Header shows user avatar/initials + dropdown with Settings and Logout.
- [ ] AC-4: Logout clears session and redirects to `/login`.
- [ ] AC-5: Active route is visually highlighted in nav.

**Dependencies:** 01.4
**Status:** drafted

### Story 01.7 — Settings page: profile + delete account
**As a** user
**I want** to view my profile and, if needed, delete my account
**So that** I have control and an exit path.

**Acceptance criteria:**
- [ ] AC-1: Settings → Profile shows email, name, auth provider, created date.
- [ ] AC-2: Edit name works and persists.
- [ ] AC-3: "Delete account" button requires typed confirmation (email address).
- [ ] AC-4: Delete cascades to all user data across v1 tables.
- [ ] AC-5: User is signed out and redirected to landing page.

**Dependencies:** 01.6
**Status:** drafted

---

## Data model impact

New tables:
```prisma
model User {
  // IMPORTANT: id is NOT generated client-side. On first login, `/api/auth/callback`
  // upserts this row with `id = auth.users.id` (the Supabase-issued uuid). Every RLS
  // policy in the app relies on `user_id = auth.uid()` — a mismatched uuid here breaks
  // data isolation across the entire schema. See alignment-2026-04-24.md Conflict #3
  // and architecture.md §6.
  id            String   @id         // explicit — DO NOT add @default(uuid())
  email         String   @unique
  name          String?
  authProvider  String   @map("auth_provider")
  createdAt     DateTime @default(now()) @map("created_at")
  settings      UserSettings?
  // ... relations added in later epics
}

model UserSettings {
  userId              String   @id @map("user_id")
  currency            String   @default("INR")
  locale              String   @default("en-IN")
  timezone            String   @default("Asia/Kolkata")
  fyStartMonth        Int      @default(4)  @map("fy_start_month")
  notificationPrefs   Json     @default("{}") @map("notification_prefs")
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Supabase `auth.users` is managed by Supabase; we maintain a shadow `public.users` for our app logic and RLS joins.

---

## API surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/callback` | OAuth / magic-link callback, upsert user |
| POST | `/api/auth/signout` | Server-side session invalidate |
| DELETE | `/api/account` | Delete the authed user + cascade |
| GET | `/api/me` | Return current user + settings |

All reads/writes enforced by Supabase RLS in addition to app-layer checks.

---

## UX references

- Login screen layout, three-method hierarchy → `front-end-spec.md § Login`
- Bottom nav (mobile) / sidebar (desktop) → `front-end-spec.md § App Shell`
- Settings / delete account flow → `front-end-spec.md § Settings`

---

## Risks

- **RLS misconfiguration** → wrong rows returned. **Mitigation:** explicit pen-test in Story 01.5 AC-3.
- **Supabase magic-link deliverability** to Gmail/Outlook. **Mitigation:** set up Supabase SMTP with a real sender domain before launch.
- **Session cookie config** for Next.js + Supabase can be tricky with Server Components. **Mitigation:** follow Supabase's `@supabase/ssr` patterns; don't invent.

---

## Definition of done (epic-level)

- [ ] All 7 stories `done`.
- [ ] I can sign up via any of 3 methods and land on an empty dashboard.
- [ ] Logging out clears session; refresh does not re-auth me.
- [ ] RLS pen-test returns zero rows for impersonated user.
- [ ] Delete-account actually removes all of my data.
- [ ] `CHANGELOG.md` has an Epic 01 entry.
- [ ] ADRs 0001, 0003, 0008 exist and are referenced.
