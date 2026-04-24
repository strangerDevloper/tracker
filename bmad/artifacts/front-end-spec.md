# Front-End Spec — Personal Finance Tracker (v1)

**Author:** Sally (UX Expert)
**Status:** v1.0 — ready for PO review
**Last updated:** 2026-04-24
**Companion docs:** `architecture.md`, `component-inventory.md`, all epics

This spec is the source of truth for every user-facing screen in v1. It exists so Sarah (PO) can write pixel-aware acceptance criteria, Bob (SM) can embed wireframes into story files, and James (Dev) never has to guess how a screen should behave.

---

## 1. Design principles (enforced throughout)

1. **Thumb reach rules mobile.** Primary actions bottom-right or full-width bottom. Never top-right on mobile.
2. **≤ 15 seconds to log an expense.** If a design adds a second of friction to this flow, it loses.
3. **Every async action has a loading state. Every empty state has a CTA.** No blank pages.
4. **Numbers right-aligned, words left-aligned.** Consistent throughout tables.
5. **Currency always has symbol + 2 decimals.** `₹200.00`, not `200` or `INR 200`.
6. **Red/green is never the only signal.** Shape, position, text back it up for color-blind users.
7. **Tap target ≥ 44×44pt.** Non-negotiable on mobile.
8. **Labels are visible, not placeholder-only.** Placeholders disappear on focus.

---

## 2. Information architecture

### Global navigation
5 top-level sections. That's the cap for v1.

```
1. Dashboard      (default landing after login)
2. Transactions   (list + search + entry)
3. Investments    (holdings + portfolio)
4. Budgets        (setup + progress)
5. Settings       (accounts, categories, import, profile)
```

Entry (the "+") is a floating action button accessible from **every** screen. Not a nav item — logging is an action, not a destination.

### Nav rendering

**Mobile (< 1024px)** — bottom tab bar
```
┌────────────────────────────────────────────────┐
│                                                │
│                 [screen body]                  │
│                                                │
│                                          ( + ) │  ← FAB, 64dp, bottom-right
│                                                │
├──────┬──────┬──────┬──────┬────────────────────┤
│ 📊   │ 📋   │ 💼   │ 🎯   │ ⚙️                  │
│ Home │ Txns │ Inv. │ Bdgts│ Settings           │
└──────┴──────┴──────┴──────┴────────────────────┘
```
Active tab: icon filled + accent color + label bold.

**Desktop (≥ 1024px)** — left sidebar, collapsible
```
┌───────────┬─────────────────────────────────────────┐
│ ₹ Tracker │                                         │
│           │                                         │
│ 📊 Home   │            [screen body]                │
│ 📋 Txns   │                                         │
│ 💼 Inv.   │                                         │
│ 🎯 Bdgts  │                                         │
│ ⚙️ Settings│                                         │
│           │                                         │
│           │                                  ( + )  │
│ TB ▾      │                                         │
└───────────┴─────────────────────────────────────────┘
```
Avatar + dropdown (settings, logout) pinned at bottom of sidebar.

---

## 3. Design tokens (short form)

Full values in `components/ui/*` shadcn setup. Highlights:

**Spacing scale** (Tailwind default): 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px.
**Radii:** 6px (inputs, buttons), 12px (cards), 999px (pills).
**Typography (mobile / desktop):**
- Display (hero numbers): 32 / 40
- H1 (page titles): 24 / 28
- H2 (section): 18 / 20
- Body: 15 / 16
- Caption: 13 / 14
**Font:** Inter (or system fallback). Numeric with `font-feature-settings: "tnum"` for table alignment.

**Color semantics (name → role, not hex):**
- `--primary` — main CTA, active nav, links. Default brand indigo.
- `--expense` — outflows. Not a pure red — desaturated so it doesn't alarm.
- `--income` — inflows. Not pure green — consistent with `expense` balance.
- `--warn` — 80%+ budget, stale prices. Amber.
- `--danger` — over-budget, destructive actions (delete, undo import). Red.
- `--muted` — secondary text, inactive icons.
- Dark mode: same tokens, remapped. Defer full dark-mode polish to v1.5 but tokens are ready.

---

## 4. Common patterns (inherited by every screen)

### 4.1 Empty states
Never just "No data." Always: **one-line explanation + one-line CTA**.

```
┌─────────────────────────────────────┐
│            📋 (muted)               │
│                                     │
│    No transactions this month.      │
│    Tap + to log your first one.     │
│                                     │
└─────────────────────────────────────┘
```

### 4.2 Loading states
- List screens: 3–5 shimmer skeleton rows. Never a centered spinner (it looks like an error).
- Chart cards: skeleton with rough bar/donut outline.
- Full-screen transitions: no loader if server component resolves <200ms. Otherwise, skeleton.

### 4.3 Error states
- Form errors: inline, below field, in `--danger`, visible icon (⚠️ or similar).
- API errors: toast at top of screen with "Retry" action. Don't block the UI.
- Fatal errors (page-level): dedicated error boundary with "Go home" and "Report issue."

### 4.4 Toasts
- Max one visible at a time (new toast replaces existing).
- 3s auto-dismiss for success, 6s for warnings, sticky for errors (manual close).
- Always actionable where possible ("Saved — View").

### 4.5 Confirmation dialogs
Used for: delete account, undo import, archive with cascading implications.
- Require **typed confirmation** (the word "delete" or the email) for irreversible actions.
- Default button is Cancel (safer).

### 4.6 Form focus order
- On open: focus the most-used field (amount for expenses).
- On save success: either close or reset to first field (based on "save & add another" pattern).
- Tab order follows visual order. Always.

### 4.7 Skeletons vs. optimistic UI
Use optimistic UI for quick-entry save (the transaction appears in the list immediately; rollback on server error). Use skeletons for anything server-fetched on page load.

---

## 5. Priority screens

Screens documented in the order Bob (SM) will need them.

---

### 5.1 Login

**Purpose:** Let a user authenticate via Google, magic link, or email/password.
**Entry points:** `/login` (all unauthenticated traffic redirected here).
**Used by epic/story:** Epic 01, Stories 01.1 / 01.2 / 01.3.

#### Layout — mobile
```
┌─────────────────────────────┐
│                             │
│                             │
│         ₹ Tracker           │  ← logo/wordmark
│                             │
│   Welcome back.             │  ← H1, warm
│   Sign in to your tracker.  │
│                             │
│  ┌───────────────────────┐  │
│  │ G   Sign in with Google│  │  ← primary (filled)
│  └───────────────────────┘  │
│                             │
│  ── or use email ──         │  ← divider with label
│                             │
│  Email                      │  ← visible label
│  ┌───────────────────────┐  │
│  │ you@example.com       │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ Send magic link       │  │  ← secondary
│  └───────────────────────┘  │
│                             │
│  [Sign in with password]    │  ← tertiary text link
│                             │
│                             │
└─────────────────────────────┘
```

Clicking "Sign in with password" reveals a password field inline and changes CTA to "Sign in":
```
┌───────────────────────┐
│ you@example.com       │
└───────────────────────┘
┌───────────────────────┐
│ ••••••••              │  ← password field
└───────────────────────┘
 [Forgot password?]        ← right-aligned, text link
┌───────────────────────┐
│ Sign in               │  ← primary, replaces magic-link CTA
└───────────────────────┘
```

#### Layout — desktop
Centered card (480px wide) on a blank canvas. Same hierarchy, same interactions. Nothing exotic.

#### Key interactions
- **Google button (primary):** triggers Supabase OAuth; full-page redirect to Google; returns to `/dashboard` on success.
- **Send magic link:** validates email → server sends link → show success banner "Check your inbox for a link to sign in. Didn't get it? [Resend]" (resend rate-limited with countdown).
- **Sign in with password (reveal):** shows password field without page transition. Remembers mode if user retries.
- **Forgot password:** opens inline flow to enter email → "If this email exists, we sent a reset link."

#### States
- **Empty (first load):** as drawn above.
- **Loading (Google OAuth):** button shows spinner + disabled; no page content change (browser handles the redirect).
- **Magic link sent:** success banner replaces form; 30s countdown on Resend.
- **Password wrong:** inline error under password field: "Email or password is incorrect."
- **Unverified email (password login before verify):** "Please verify your email. Resend verification."
- **Rate limited:** friendly message with countdown ("Too many attempts. Try again in 2 minutes.").

#### Accessibility
- Focus on load: email field.
- Labels visible (not just placeholder).
- Error messages linked to fields via `aria-describedby`.
- Google button has `aria-label="Sign in with Google"`.
- Tab order: Google → email → magic link → password toggle → (if shown) password → forgot link → Sign in.
- Keyboard: Enter on email field triggers primary action in current mode.

---

### 5.2 App shell (layout, nav, header)

**Purpose:** Wraps all authenticated pages with consistent nav, header, FAB.
**Entry points:** every `(finance)` route.
**Used by epic/story:** Epic 01 Story 01.6.

#### Header (both breakpoints)
```
┌──────────────────────────────────────────────────┐
│ Apr 2026    ◀   ▶            🔔       TB ▾      │
└──────────────────────────────────────────────────┘
```
- **Left:** month picker (prev / label / next) — sticky. Used by Dashboard, Transactions, Budgets. Hidden on Investments and Settings (not month-scoped).
- **Right:** alert bell (inbox of budget alerts, recent imports) + avatar dropdown.

#### FAB (mobile + desktop)
`( + )` in bottom-right corner, 64dp. Tap opens entry picker sheet:
```
┌──────────────────────────────────┐
│           New entry              │
├──────────────────────────────────┤
│  💸   Expense                    │
│  💰   Income                     │
│  🔄   Transfer                   │
│  💼   Investment transaction     │
└──────────────────────────────────┘
```
Single tap picks the type → opens the relevant entry sheet (5.4 for expense). Default selection on long-press of FAB = last-used type.

#### Empty "no accounts yet" banner
As specified in Epic 02 Story 02.5:
```
┌──────────────────────────────────────┐
│ ⚠  Add your first account to start   │
│    tracking.                  [Add]  │
└──────────────────────────────────────┘
```
Dismissible? No. Persists until user has ≥1 account.

---

### 5.3 Dashboard

**Purpose:** Monthly review + one-glance health check across the 4 dimensions the user cares about.
**Entry points:** `/dashboard` (default after login).
**Used by epic/story:** Epic 06 all stories.

#### Card ordering (opinionated)

This matters. When user opens the app, they see cards in this order:

1. **Net worth + savings rate** — the single most emotionally relevant number.
2. **Category breakdown** (this month's spending + budget progress) — the "decision-relevant" card.
3. **Portfolio snapshot** — lower-frequency check but high-value when looked at.
4. **12-month trend** — the "long view." Last on mobile because it's informational, not actionable.

#### Layout — mobile (stacked, sticky month picker)
```
┌─────────────────────────────────────┐
│ Apr 2026 ◀ ▶              🔔  TB ▾  │  ← sticky header
├─────────────────────────────────────┤
│  ⚠ You're over budget on Food.     │  ← banner only if applicable
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Net worth                       │ │
│ │ ₹ 12,48,500              +2.3%  │ │  ← vs. last month
│ │  ▁▂▃▃▄▅▆▇▆▇▇█                  │ │  ← 12-mo sparkline
│ │                                 │ │
│ │ Savings rate this month: 32%    │ │
│ │ ▼ Monthly flow ▸                │ │  ← collapse/expand waterfall
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Where money went · Apr          │ │
│ │   ⬤ Food        ₹ 8,120   81%  │ │  ← progress bar per budgeted cat
│ │   ⬤ Rent        ₹ 25,000  100% │ │
│ │   ⬤ Transport   ₹ 3,200   64%  │ │
│ │   ⬤ Shopping    ₹ 4,100     —  │ │  ← — = no budget set
│ │   ⬤ Other       ₹ 2,040        │ │
│ │                                 │ │
│ │         (donut, centered)       │ │
│ │           ₹ 42,460              │ │
│ │          total this mo.         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Portfolio             ⟳ 2h ago  │ │
│ │                                 │ │
│ │     (allocation donut)          │ │
│ │                                 │ │
│ │ • PPFAS Flexi     ₹ 3.2L  18%  │ │
│ │ • HDFC FD         ₹ 2.5L  14%  │ │
│ │ • Reliance        ₹ 1.9L  11%  │ │
│ │                                 │ │
│ │          [See all →]            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 12-month trend                  │ │
│ │ (stacked bar chart,             │ │
│ │  savings-rate line overlay)     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

Header stays sticky as user scrolls so the month picker is always reachable.

#### Layout — desktop (2×2 grid, sidebar nav, 1280px wide design)
```
┌────────┬──────────────────────────────────────────────┐
│        │ Apr 2026 ◀ ▶                   🔔    TB ▾    │
│ nav    ├──────────────────────────────────────────────┤
│        │ ⚠ You're over budget on Food.                │
│        ├──────────────────────────┬───────────────────┤
│        │ Net worth                │ Where money went  │
│        │ ₹ 12,48,500    +2.3%     │                   │
│        │  ▁▂▃▃▄▅▆▇▆▇▇█           │    (donut)        │
│        │ Savings 32%   Waterfall  │  Food    ₹ 8,120  │
│        │                          │  Rent    ₹ 25,000 │
│        ├──────────────────────────┼───────────────────┤
│        │ Portfolio  ⟳ 2h          │ 12-month trend    │
│        │  (donut)                 │                   │
│        │  holdings table          │  (stacked bars)   │
│        │                          │                   │
└────────┴──────────────────────────┴───────────────────┘
```

#### Key interactions
- **Month picker:** updates all 4 cards simultaneously (single aggregated server call).
- **Donut slice click** → drill into filtered transactions for that category + month.
- **Category row click** → same drill.
- **"See all" on portfolio** → navigate to `/investments`.
- **Waterfall expand** → inline reveal, no modal.
- **Over-budget banner** → tapping dismisses for the session; reappears on next load.

#### States
- **Brand new user (no txns, no investments):** show onboarding cards — "Add your first account," "Log your first expense," "Add a holding to track investments." Completed items fade out.
- **Partial data (txns yes, investments no):** portfolio card shows empty state: "No holdings yet. [Add one]."
- **Stale prices (>48h):** amber indicator next to "⟳ 2 days ago" with tooltip explaining.
- **Loading:** 4 skeleton cards matching layout.

#### Accessibility
- Skip-link at top: "Skip to dashboard content."
- All charts have text equivalent below (hidden visually, read by screen readers).
- Donut slices are buttons with `aria-label`s including value + percent.
- Month picker buttons have `aria-label="Previous month"` / `"Next month"`.

---

### 5.4 Quick expense entry (the most important screen)

**Purpose:** Log an expense in ≤ 15 seconds, 3 taps max, on mobile.
**Entry points:** FAB → "Expense" on every screen.
**Used by epic/story:** Epic 03 Story 03.1.

#### Layout — mobile (bottom sheet)
```
┌─────────────────────────────┐
│ ×                        ✓  │  ← close / save (save = primary)
├─────────────────────────────┤
│                             │
│     ₹ 200                   │  ← 32pt, live update, cursor
│ ─────────────────────       │
│                             │
│  🍔  Food              ▾    │  ← chip; last used; tap → sheet
│  💳  HDFC Credit Card  ▾    │  ← chip; last used; tap → sheet
│  📝  Add a note             │  ← optional, placeholder-only
│  📅  Today              ▾   │  ← date; default today
│                             │
├─────────────────────────────┤
│       [ 7 ][ 8 ][ 9 ]       │
│       [ 4 ][ 5 ][ 6 ]       │  ← numeric keypad, ALWAYS on
│       [ 1 ][ 2 ][ 3 ]       │
│       [ . ][ 0 ][ ⌫ ]       │
└─────────────────────────────┘
```

**What I'm optimizing for:** when a user opens this, they should type a number and tap ✓. That's it. Everything else is already filled from last-used.

#### Layout — desktop
Modal dialog, 420px wide. Same content. Keypad **not rendered on desktop** (user has a real keyboard); amount field is a standard text input with numeric mode. Save button bottom-right.

#### Key interactions
- **Open:** amount field focused, keypad visible, "200" is a *live* formatted display as user taps keys.
- **Tap ✓:** validate (amount > 0) → save → optimistic toast "Saved ₹200 to Food" → close sheet. If save fails on server, re-open sheet with the values and show error.
- **Tap category chip:** opens bottom sheet with grid of categories (icon + name, searchable). Recent categories pinned to top.
- **Tap account chip:** opens bottom sheet with account list.
- **Tap "Add a note":** reveals text input inline (doesn't grow the sheet much).
- **Tap date:** native date picker on mobile, popover on desktop.
- **Swipe down to dismiss:** soft-ask "Discard?" only if amount was typed.

#### Rapid-entry pattern (deferred to v1.5)
I considered a "Save & add another" option for grocery-shop scenarios (5 items entered rapidly). **Deferring to v1.5** — the keypad-always-on design already makes sequential entries fast, and adding this in v1 complicates the "tap ✓ = close" muscle memory. Flag for Sarah: Epic 03 Story 03.1 AC does NOT include rapid-entry; explicitly v1.5.

#### States
- **Empty (amount = 0):** save button disabled.
- **No accounts exist:** sheet cannot open; instead, FAB opens account-creation sheet with message "Add your first account before logging expenses."
- **No categories loaded:** shouldn't happen (defaults seeded); if it does, show "Categories unavailable — try again."
- **Save in flight:** ✓ shows spinner, sheet stays open; prevents double-tap.
- **Save failed:** sheet stays open; inline error banner at top; values preserved.

#### Accessibility
- Sheet has `role="dialog"` + `aria-labelledby`.
- Keypad keys are buttons with `aria-label`s ("Seven", "Decimal point").
- Keyboard users on desktop can type directly into amount field; keypad is purely a mobile convenience.
- Close button is reachable by tabbing (first focusable element for screen readers).

---

### 5.5 Detailed expense entry + Income + Transfer

**Purpose:** Same entry flow with additional fields; income with classification; transfer as paired transaction.
**Entry points:** Quick entry → "More details" toggle; FAB → "Income"; FAB → "Transfer."
**Used by epic/story:** Epic 03 Stories 03.2, 03.3, 03.9.

#### Detailed expense — expand from quick entry
```
┌─────────────────────────────┐
│ ×                        ✓  │
├─────────────────────────────┤
│     ₹ 200                   │
│  🍔  Food              ▾    │
│  💳  HDFC CC           ▾    │
│  📝  "Dinner at Olive"      │  ← note expanded
│  📅  Today              ▾   │
│  ▲ More                     │  ← collapsed more fields
├─────────────────────────────┤
│  🏪 Merchant                │
│     "Olive, Bandra"         │
│  🏷️ Tags (pill multiselect) │
│     [dinner ×] [+ Add]      │
│  📎 Receipt (v1.5)          │  ← disabled with tooltip "coming soon"
└─────────────────────────────┘
```

#### Income entry — difference from expense
- Account is the **credited** account (language: "into [Account]").
- **Income type** dropdown: Salary / Business / Dividend / Interest / Rental / Capital Gain / Gift / Refund / Other.
- If type = Salary: optional "Employer" text input below.
- If type = Dividend or Interest: optional "Link to holding" picker (for Epic 04 attribution).
- Colors: the ✓ CTA is `--income` green, amount display numbers are green.

#### Transfer entry
```
┌─────────────────────────────┐
│ ×             Transfer   ✓  │
├─────────────────────────────┤
│     ₹ 10,000                │
│                             │
│  From:  HDFC Savings    ▾   │
│     ↓                       │  ← animated arrow
│  To:    ICICI Savings   ▾   │
│                             │
│  📝  Note (optional)        │
│  📅  Today              ▾   │
├─────────────────────────────┤
│       (numeric keypad)      │
└─────────────────────────────┘
```

Validation: `from ≠ to`; both required; both active (not archived).

---

### 5.6 Transaction list + search

**Purpose:** Review, search, and manage historical transactions.
**Entry points:** Nav → Transactions; dashboard drill-downs.
**Used by epic/story:** Epic 03 Stories 03.6a, 03.6b, 03.7, 03.8.

#### Layout — mobile
```
┌─────────────────────────────────────┐
│ Apr 2026 ◀ ▶              🔔  TB ▾  │
├─────────────────────────────────────┤
│  🔍 Search                          │  ← sticky search
│  [All] [Expense] [Income] [Xfer]    │  ← type filter pills
│  Filter ▾   Export ▾                │  ← collapsible advanced
├─────────────────────────────────────┤
│  📅 Today                           │  ← date group header
│  🍔 Food              ₹ 200    💳  │
│     Zomato                   HDFC   │
│  ──────────────────────────────────  │
│  🛒 Groceries         ₹ 1,240  💳  │
│     BigBasket                HDFC   │
│  ──────────────────────────────────  │
│                                     │
│  📅 Yesterday                       │
│  ⛽ Fuel              ₹ 2,500  💵  │
│     Shell                    Cash   │
│  ──────────────────────────────────  │
│  💰 Salary           ₹ 85,000  🏦  │ ← income row, green amount
│     (salary)                 HDFC   │
│                                     │
│  [Load more] (50 at a time)         │
└─────────────────────────────────────┘
```

Each row: 52dp tall (comfortable thumb target, not cramped). Amount right-aligned in tabular numerals.

#### Layout — desktop
Table with columns: Date | Category | Note | Merchant | Account | Amount. Sortable column headers. Filter drawer docks to right side (not modal).

#### Key interactions
- **Tap row** → detail view (can edit, delete).
- **Long-press / right-click row** → quick actions menu (duplicate, edit, delete).
- **Search:** debounced 250ms; searches description + merchant; filter pills remain active.
- **Filter drawer:** date range, account multi-select, category multi-select, amount min/max.
- **Export:** CSV download (Epic 03 F14 → v1.5); disabled in v1 with "coming soon" tooltip.

#### States
- **No matches for filter:** "No transactions match. [Clear filters]."
- **Empty (brand-new user):** "Log your first transaction." with CTA.
- **Search mid-type:** results update with subtle skeleton on changing rows.

---

### 5.7 Investment holdings (list + detail)

**Purpose:** Portfolio at a glance; drill to any holding for audit.
**Entry points:** Nav → Investments; dashboard portfolio card "See all."
**Used by epic/story:** Epic 04 Stories 04.8, 04.9.

**Dual rendering rule:** cards on mobile, table on desktop.

#### Layout — mobile (card list)
```
┌─────────────────────────────────────┐
│ Investments          ⟳ 2h ago       │
├─────────────────────────────────────┤
│ Total: ₹ 12,45,000   +8.2% XIRR     │  ← summary bar
│ [All] [MF] [Stocks] [FD] [Crypto]   │  ← asset-class filter pills
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ PPFAS Flexi Cap                 │ │
│ │ MF · Parag Parikh               │ │
│ │  Invested ₹ 2,50,000            │ │
│ │  Current  ₹ 3,18,420   +27.4%   │ │  ← green
│ │  XIRR 14.2%      18% of port    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ HDFC FD · 2024 Series           │ │
│ │ FD · HDFC Bank · mat Dec 2029   │ │
│ │  Invested ₹ 2,00,000            │ │
│ │  Current  ₹ 2,48,500   +24.3%   │ │
│ │  Rate 7.1%       14% of port    │ │
│ └─────────────────────────────────┘ │
│ ... (more)                          │
└─────────────────────────────────────┘
```

Tapping a card → holding detail.

#### Layout — desktop (table)
```
┌───────────────────────────────────────────────────────────────────────────┐
│ Investments      Total ₹ 12,45,000    +8.2% XIRR         ⟳ Refresh  + Add │
│ [All] [MF] [Stocks] [FD] [Crypto] ...                                     │
├───────────────────────────────────────────────────────────────────────────┤
│ Name              Class    Invested    Current      Return    XIRR   % │
│ PPFAS Flexi Cap    MF     ₹ 2,50,000  ₹ 3,18,420   +27.4%    14.2%  18%│
│ HDFC FD 2024       FD     ₹ 2,00,000  ₹ 2,48,500   +24.3%     7.1%  14%│
│ Reliance Ind.      STOCK  ₹ 1,10,000  ₹ 1,89,400   +72.2%    19.4%  11%│
│ ... sortable columns, sticky header                                       │
├───────────────────────────────────────────────────────────────────────────┤
│ Totals                    ₹ 5,60,000  ₹ 7,56,320   +35.1%                │
└───────────────────────────────────────────────────────────────────────────┘
```

Returns column: positive = green + up arrow + "+X.X%"; negative = red + down arrow. XIRR negative also styled.

#### Holding detail (both breakpoints, adapts width)
```
┌─────────────────────────────────────┐
│ ← Back                              │
│                                     │
│  PPFAS Flexi Cap                    │
│  MF · Parag Parikh · INF879O01027   │
│  Linked to: Zerodha Coin            │
│                                     │
│ ┌─────────────┬─────────────────┐   │
│ │ Invested    │ Current          │   │
│ │ ₹ 2,50,000  │ ₹ 3,18,420       │   │
│ │             │ +₹ 68,420 (+27%)│   │
│ │             │ XIRR 14.2%       │   │
│ └─────────────┴─────────────────┘   │
│                                     │
│  12-mo NAV chart (for auto-priced)  │
│  ─────── line ──────                │
│                                     │
│  Transactions                       │
│  📅 05 Jan 2024   SIP   ₹ 10,000   │
│  📅 05 Feb 2024   SIP   ₹ 10,000   │
│  📅 15 Mar 2025   DIV   ₹   420    │
│  ... (full chronological)           │
│                                     │
│  [Add transaction]   [Edit holding] │
└─────────────────────────────────────┘
```

#### States
- **Stale prices:** `⟳ 3 days ago` in amber with tooltip "Price source unreachable. Showing last known value."
- **Manual-value holding:** shows "Last updated DD Mon YYYY" + prominent "Update value" button.
- **Empty portfolio:** "No holdings yet. [Add one]" hero empty state.

---

### 5.8 Accounts (list + create/edit)

**Purpose:** Manage bank, card, wallet, and loan accounts.
**Entry points:** Settings → Accounts.
**Used by epic/story:** Epic 02 all stories.

#### List
Grouped by type with balance totals per group:
```
Banks                          Total ₹ 1,24,500
┌─────────────────────────────────────────┐
│ HDFC Savings          ₹ 84,500          │
│ ICICI Savings         ₹ 40,000          │
└─────────────────────────────────────────┘

Cards                   Outstanding ₹ 18,200
┌─────────────────────────────────────────┐
│ HDFC Credit Card      ₹ 18,200 / ₹2L     │  ← outstanding / limit
│ Statement on 5th                         │
└─────────────────────────────────────────┘

Wallets / Cash                Total ₹ 2,100
Loans                   Outstanding ₹ 12L
Archived (3)  ▸                           ← expandable
```

#### Create form — single screen, progressive
- Type picker first (radio cards with icons). Picking the type reveals the right fields.
- `SAVINGS`/`CURRENT`/`CASH`/`UPI`: name + opening balance + date.
- `CREDIT_CARD`: + limit + statement day.
- `LOAN`: + principal + rate + tenure + EMI.

Primary button: "Add account" (disabled until required fields valid).

---

### 5.9 Categories

**Purpose:** Let user curate taxonomy beyond defaults.
**Entry points:** Settings → Categories.
**Used by epic/story:** Epic 03 Stories 03.4, 03.5.

#### Layout
Tabs: Expense | Income. Each shows default categories (system) + user-created. Defaults can be hidden (toggle visibility), not deleted.

Each row: icon + name + "used N times" + actions (edit / archive).

Create/Edit: modal with name, type (locked for defaults), parent category, color picker, icon picker (Lucide icon set).

---

### 5.10 Budgets

**Purpose:** Set monthly per-category budgets and see progress.
**Entry points:** Nav → Budgets.
**Used by epic/story:** Epic 05 all stories.

#### Layout — mobile
```
┌─────────────────────────────────────┐
│ Apr 2026 ◀ ▶              🔔  TB ▾  │
├─────────────────────────────────────┤
│ Budgeted:  ₹ 58,000                 │
│ Spent:     ₹ 42,460 (73%)           │
│ [Copy from last month]              │
├─────────────────────────────────────┤
│ 🍔 Food           ₹ 8,120 / ₹10,000 │
│ ████████████░░░░░  81%   (warn)     │
│                                     │
│ 🏠 Rent           ₹ 25,000 / ₹25,000│
│ ████████████████  100%  (over line) │
│                                     │
│ 🚗 Transport       ₹ 3,200 / ₹ 5,000│
│ ████████░░░░░░░░   64%   (under)    │
│                                     │
│ 🛒 Shopping        ₹ 4,100 / —     │
│ [Set budget]                        │
│                                     │
│ ...                                 │
└─────────────────────────────────────┘
```

Tapping a bar or category → inline edit amount (number field + Save/Cancel). Instant update.

#### States
- **No budgets set:** "Set your first budget" hero card with "Copy from last month" (disabled if no prior month).
- **Over budget (any):** over-budget rows have red progress bar + clear "₹X over" text.
- **Warning (80–100%):** amber bar.

---

### 5.11 Import wizard (Excel / CSV)

**Purpose:** Migrate historical data from Excel to the app.
**Entry points:** Settings → Import.
**Used by epic/story:** Epic 07 all stories.

#### Flow (6 steps with a stepper)
```
1. Upload → 2. Sheet → 3. Columns → 4. Categories → 5. Accounts → 6. Preview
```

Progress indicator at top of each step with "◀ Back" and "Next ▶" / "Import ✓" (final step).

#### Step 1 — Upload
```
┌─────────────────────────────┐
│   📤  Drop file or          │
│       click to browse       │
│                             │
│   .xlsx, .xls, .csv         │
│   Up to 10 MB               │
└─────────────────────────────┘
```

#### Step 2 — Sheet + header row
Tabs for sheets (Excel); preview of first 10 rows for the selected sheet; radio to pick header row.

#### Step 3 — Column mapping
Two-column layout: left = fields the app needs (Date, Amount, Account, Category, Note, Merchant, Type); right = your columns to map. Auto-guesses highlighted.

```
App field          Your column
Date          →    [ Date ▾ ]     ← auto-guess
Amount        →    [ Debit ▾ ]     ← signing hint if debit/credit detected
Account       →    [ Account ▾ ]
Category      →    [ Category ▾ ]
Note          →    [ Description ▾ ]
```

#### Step 4 — Category mapping
Two columns: your categories (file) → app categories (select or "Create new").

```
Your category      →   App category
"Food"                 [ Food & Dining ▾ ]   auto
"Groceries"            [ Groceries ▾ ]       auto
"Misc"                 [ — choose — ▾ ]      blocks Next
"Coffee"               [ + Create new ]       opens mini modal
```

#### Step 5 — Accounts
Same pattern as categories. "Create new" inline.

#### Step 6 — Preview
Table of first 20 rows with parsed values + warnings column:
```
✅ 05 Apr 2026 | Food | HDFC CC | ₹ 200  | "Zomato"
✅ 04 Apr 2026 | Rent | HDFC Sv | ₹25000 | "April rent"
⚠ 03 Apr 2026 | — | — | ₹ 0 | "Reversal" (zero amount)
⚠ 02 Apr 2026 | — | — | ₹ 12,00,000 | "transfer" (large amt)
```

Summary line: "Will import 312 transactions across 8 categories and 3 accounts. 2 warnings to review."

Confirm = primary button; becomes "Importing…" with progress bar during commit (<5s for 1k rows). Success → "Imported 312 txns." toast + navigate to transactions list filtered by this import batch.

---

### 5.12 Settings (overview)

Simple nested menu; each item is its own page. Included here briefly.

```
Settings
├─ Profile                (name, email, auth provider)
├─ Accounts              → 5.8
├─ Categories            → 5.9
├─ Import data           → 5.11
├─ Import history        (list of past imports, undo within 24h)
├─ Budget preferences     (email alerts on/off)
├─ Appearance            (dark mode, currency format — v1.5)
├─ Data & privacy        (export CSV — v1.5, delete account)
└─ About                  (version, changelog, feedback link)
```

---

## 6. Responsive rules (summary)

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 640px | Single column, bottom nav, FAB, bottom sheets for entry |
| Tablet | 640–1023px | Single column, bottom nav, modal dialogs for entry |
| Desktop | ≥ 1024px | Sidebar nav, 2-column where applicable, modal dialogs |
| Wide | ≥ 1440px | Max content width 1280px, centered |

**Don't** auto-reflow the investments table to mobile — use the card view instead (§5.7). **Don't** auto-reflow the dashboard 2×2 grid to mobile — use the stacked ordering from §5.3.

---

## 7. Accessibility floor (must pass)

Not comprehensive WCAG work, but a non-negotiable minimum:

1. **Color contrast:** body text ≥ 4.5:1, UI text ≥ 3:1.
2. **Keyboard navigation:** every interactive element reachable and operable. No keyboard traps.
3. **Focus visible:** clear focus ring, not disabled.
4. **Form labels:** always visible, always programmatically associated.
5. **Error identification:** inline, with icon + color + text.
6. **Screen reader text:** charts have sibling text equivalents; icon-only buttons have `aria-label`s.
7. **Reduced motion:** respect `prefers-reduced-motion` (no slide animations on sheets).

---

## 8. Open questions (for PM / Architect / PO)

Items I hit while speccing:

1. **Sub-category aggregation in donut (§5.3 Card 2).** Do we roll up "Groceries" under "Food & Dining" in the dashboard donut, or show them separately? Flagged in architecture §15 already. Default: roll up to parent; children shown in the category list below the donut. **Needs John's call.**
2. **Dashboard empty state for brand-new user.** I drafted an onboarding-card pattern. John — do you want a dedicated onboarding screen instead, or live with the cards-on-dashboard approach? Recommend the latter: less friction.
3. **Rapid expense entry ("Save & add another").** I deferred to v1.5 as a principled call. Sarah — please confirm this is explicitly NOT in Epic 03 Story 03.1 AC.
4. **Transfer between own account shown as "expense" in account outflow chart?** Currently excluded (correct for net income/expense). But the user's bank view shows the outflow. Product call: is "Account detail" a future feature that shows transfers separately? v1.5 consideration.
5. **Receipt upload UI.** Schema is ready (Epic 03 AC-4). I put it as disabled with tooltip. John — should I ship a bare-bones upload in v1 since Supabase Storage is already planned? 2-day addition. If no, keep it disabled.

---

## 9. Handoff to PO (Sarah)

Sarah, front-end spec is at `bmad/artifacts/front-end-spec.md`. **Epic coverage:**

- Epic 01 (Auth & Shell): §5.1 + §5.2
- Epic 02 (Accounts): §5.8
- Epic 03 (Transactions): §5.4 + §5.5 + §5.6 + §5.9
- Epic 04 (Investments): §5.7
- Epic 05 (Budgets): §5.10
- Epic 06 (Dashboard): §5.3
- Epic 07 (Data import): §5.11

**5 open questions in §8 need resolution before the affected epics enter execution.** Of these, Question 1 (sub-category aggregation) and Question 3 (rapid-entry deferral) directly affect Epic 03 and Epic 06 AC — tackle those first.

Component inventory in `component-inventory.md` for Winston/James reference.

---

*End of front-end spec v1.0. Any screen change after PO sign-off requires an updated spec section — do not change screens in code without updating this doc.*
