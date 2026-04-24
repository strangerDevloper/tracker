# Epic 05 — Budgets & Alerts

**Status:** drafted
**Owner:** Tushar
**Depends on:** Epic 03 (categories + transactions)
**Unblocks:** Epic 06 (dashboard renders budget progress)
**Estimated duration:** ~4 days

---

## Why this epic exists

Tracking expenses tells you what happened. **Budgets tell you whether to change it.** This epic is the behavior-change engine — set a category budget, get a friendly warning at 80%, a stronger warning at 100%, and feel the light friction that redirects a spending decision *before* it happens.

Without budgets, the app is a pretty Excel. With them, it earns daily use.

---

## Scope — in

- Monthly budget per category.
- Alert thresholds at 80% and 100% (hard-coded in v1; user-configurable in v1.5).
- In-app banner on dashboard when a category exceeds threshold.
- Email alert via Resend (one per threshold per month; deduped).
- Budget CRUD (set, edit, clear for a given month).
- "Copy from last month" helper on the budget setup screen.
- Budget vs. actual progress bar on each category card in dashboard.

## Scope — out

- ❌ Weekly / yearly budgets (v1.5).
- ❌ Budget rollover (unused budget carries over) — v1.5.
- ❌ Configurable alert thresholds — v1.5.
- ❌ Goal-based budgets ("save ₹50k for Europe trip") — v1.5 as "Goals" feature.
- ❌ WhatsApp alert delivery — v2.

---

## User stories

### Story 05.1 — Create / edit a monthly budget
**As a** user
**I want** to set a monthly budget for a category
**So that** I have a reference point for my spending.

**Acceptance criteria:**
- [ ] AC-1: Settings → Budgets → pick a month (defaults to current) → see list of expense categories with budget amount inputs.
- [ ] AC-2: Enter amount per category; save persists one `budgets` row per (user, category, month).
- [ ] AC-3: If a budget already exists for that (category, month), editing updates it.
- [ ] AC-4: Empty amount = no budget for that category that month.
- [ ] AC-5: "Copy from last month" button pre-fills inputs from previous month.

**Dependencies:** Epic 03 (categories must exist).
**Status:** drafted

### Story 05.2 — Budget progress computation
**As the** system
**I want** to compute month-to-date spend vs. budget for each category
**So that** progress is always fresh on the dashboard.

**Acceptance criteria:**
- [ ] AC-1: Server helper `getBudgetProgress(userId, month)` returns an array: `{ categoryId, budgetAmount, spentAmount, percentUsed, status }`.
- [ ] AC-2: `status` = `under` (<80%), `warning` (80–100%), `over` (>100%).
- [ ] AC-3: Excludes `TRANSFER` transactions.
- [ ] AC-4: Query performs <200ms for a typical user.
- [ ] AC-5: Unit-tested with fixtures for edge cases (no transactions, exact 80%, over-budget).

**Dependencies:** 05.1 + Epic 03 done.
**Status:** drafted

### Story 05.3 — Dashboard budget UI
**As a** user
**I want** to see budget progress on the dashboard
**So that** I'm aware of my position at a glance.

**Acceptance criteria:**
- [ ] AC-1: Dashboard's category-breakdown card shows each budgeted category with a progress bar.
- [ ] AC-2: Colors: green (under), amber (warning), red (over).
- [ ] AC-3: Shows "₹X of ₹Y" or "₹X over budget."
- [ ] AC-4: Non-budgeted categories are listed below without bars.
- [ ] AC-5: Click a category row → filtered transaction list.

**Dependencies:** 05.2, Epic 06 (dashboard card exists).
**Status:** drafted

### Story 05.4 — Budget alert emails
**As a** user
**I want** an email when I cross 80% or 100% of a category budget
**So that** I can adjust behavior.

**Acceptance criteria:**
- [ ] AC-1: Cron runs daily at 8 PM IST, iterates over budgeted categories.
- [ ] AC-2: For each category that crossed a threshold since the last check, send an email via Resend.
- [ ] AC-3: `budget_alerts_sent` table dedupes: one send per (budget_id, threshold, month).
- [ ] AC-4: Email content: clear subject (`⚠ Food budget 80% used — ₹8,120 of ₹10,000`), 2-sentence body, link to dashboard.
- [ ] AC-5: User can disable email alerts per category in settings (v1: one global on/off is acceptable).

**Dependencies:** 05.2. Resend configured.
**Status:** drafted

### Story 05.5 — In-app alert banner
**As a** user
**I want** a visible banner on the dashboard when I'm over budget on any category
**So that** I notice without opening email.

**Acceptance criteria:**
- [ ] AC-1: Top-of-dashboard banner: "You're over budget on Food and Entertainment this month."
- [ ] AC-2: Dismissible for the current session (reappears next session if still over).
- [ ] AC-3: Only shown when ≥1 category has status = `over`.

**Dependencies:** 05.2
**Status:** drafted

### Story 05.6 — Delete / clear a budget
**As a** user
**I want** to remove a budget I set by mistake
**So that** it stops appearing in my progress views.

**Acceptance criteria:**
- [ ] AC-1: Setting amount to 0 or empty + save deletes the budget row.
- [ ] AC-2: Category returns to the "no budget" section on dashboard.
- [ ] AC-3: Existing alert-sent records for that month remain (audit).

**Dependencies:** 05.1
**Status:** drafted

---

## Data model impact

```prisma
model Budget {
  id               String   @id @default(uuid())
  userId           String   @map("user_id")
  categoryId       String   @map("category_id")
  month            String   // YYYY-MM
  amount           Int      // paise
  alertThresholds  Decimal[] @default([0.8, 1.0]) @map("alert_thresholds")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category         Category @relation(fields: [categoryId], references: [id])
  alertsSent       BudgetAlertSent[]

  @@unique([userId, categoryId, month])
}

model BudgetAlertSent {
  id         String   @id @default(uuid())
  budgetId   String   @map("budget_id")
  threshold  Decimal
  sentAt     DateTime @default(now()) @map("sent_at")

  budget     Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)

  @@unique([budgetId, threshold])
}
```

---

## API surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/budgets?month=YYYY-MM` | List budgets for a month |
| POST | `/api/budgets` | Create/update budget |
| DELETE | `/api/budgets/[id]` | Clear a budget |
| GET | `/api/budgets/progress?month=YYYY-MM` | Spend vs. budget snapshot |
| POST | `/api/cron/send-budget-alerts` | Cron endpoint |

---

## UX references

- Budget setup page (category grid with inputs) → `front-end-spec.md § Budgets`
- Dashboard progress card with bars → `front-end-spec.md § Dashboard · Category Card`
- Banner on over-budget → `front-end-spec.md § Alerts`
- Email template → `bmad/artifacts/email-templates/budget-alert.md`

---

## Risks

- **Alert fatigue.** If I get 5 emails on day 25 of the month, I start ignoring them. **Mitigation:** dedupe per threshold per month; batch multiple categories into a single daily email.
- **Wrong cron timezone** → alerts fire at odd hours. **Mitigation:** explicit IST; log cron runs.
- **Budget expressed in monthly amount** doesn't match pay cycles for some users. **Mitigation:** acceptable for v1; revisit in v1.5 with configurable cycle.

---

## Definition of done (epic-level)

- [ ] All 6 stories `done`.
- [ ] I can set a ₹10k Food budget, log ₹8.5k of food expenses, and receive an 80% email.
- [ ] Dashboard banner appears when any category is over-budget.
- [ ] Progress bars colored correctly (green/amber/red) on dashboard.
- [ ] "Copy from last month" works.
- [ ] `CHANGELOG.md` has Epic 05 entry.
