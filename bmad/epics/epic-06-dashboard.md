# Epic 06 — Dashboard & Analytics

**Status:** drafted
**Owner:** Tushar
**Depends on:** Epic 03 (transactions), Epic 04 (investments), Epic 05 (budgets)
**Unblocks:** nothing (terminal view epic)
**Estimated duration:** ~1 week

---

## Why this epic exists

Logging is half the job — **insight is the other half.** The dashboard is what the user opens 4+ times a week. Its quality determines whether the app becomes a habit or a graveyard.

This epic ships the four dashboard cards the user explicitly prioritized:
1. **Where is my money going?** — category breakdown
2. **Am I spending more or less over time?** — trend
3. **What's my savings rate & net worth?** — aggregate flow
4. **How's my portfolio performing?** — investment snapshot

Everything upstream (txns, investments, budgets) exists to feed these four views.

---

## Scope — in

- Dashboard landing page with 4 cards (responsive: stacked on mobile, 2×2 grid on desktop).
- Month selector (defaults to current month, supports navigating history).
- Card 1 — **Category breakdown** donut + budget bars (uses Epic 05 progress data).
- Card 2 — **Trend** 12-month bar chart (income, expense, savings rate overlay).
- Card 3 — **Net worth & savings rate** single-number + sparkline + monthly waterfall.
- Card 4 — **Portfolio** allocation donut + top-holdings summary.
- Drill-downs from each card to its source data.

## Scope — out

- ❌ Custom dashboard layouts / widget reordering (v2).
- ❌ Date range other than "month" (v1.5 adds YTD and custom range).
- ❌ Comparison between periods (v1.5).
- ❌ Exportable PDF monthly summary (v2).
- ❌ Benchmark comparisons (fund vs. index) (v2).

---

## User stories

### Story 06.1 — Dashboard shell (layout, month picker, responsive grid)
**As a** user
**I want** a dashboard page that adapts between mobile and desktop
**So that** my monthly review works on either.

**Acceptance criteria:**
- [ ] AC-1: Route `/dashboard` is the default landing after login.
- [ ] AC-2: Mobile: 4 cards stacked vertically, swipe-independent scrolling.
- [ ] AC-3: Desktop (≥1024px): 2×2 grid.
- [ ] AC-4: Header with month picker (prev / current / next month).
- [ ] AC-5: Month picker state persists in URL query (`?month=2026-04`).
- [ ] AC-6: Loading skeleton for each card while data fetches.

**Dependencies:** Epic 01 done.
**Status:** drafted

### Story 06.2 — Card 1: Category breakdown donut
**As a** user
**I want** to see this month's expenses broken down by category
**So that** I know where my money went.

**Acceptance criteria:**
- [ ] AC-1: Donut chart showing top 6 categories + "Other"; slices sized by spend.
- [ ] AC-2: Center of donut shows total expense for the month.
- [ ] AC-3: Clicking a slice navigates to `transactions` list filtered by that category + month.
- [ ] AC-4: Below donut: a list of all categories with budget progress bars (if budgeted — uses Epic 05 `getBudgetProgress`).
- [ ] AC-5: Empty state: "No expenses logged this month. Tap + to add one."

**Dependencies:** 06.1, Epic 03, Epic 05.
**Status:** drafted

### Story 06.3 — Card 2: 12-month trend
**As a** user
**I want** to see income, expense, and savings-rate trend over 12 months
**So that** I can spot drift early.

**Acceptance criteria:**
- [ ] AC-1: Stacked bar chart per month: green = income, red = expense; line overlay = savings rate %.
- [ ] AC-2: Covers last 12 months ending with selected month.
- [ ] AC-3: Tooltip on hover/tap: month, income, expense, savings rate.
- [ ] AC-4: Savings-rate = `(income − expense) / income × 100` using non-transfer rows.
- [ ] AC-5: If fewer than 12 months of data, chart starts at earliest txn; empty months explicit, not hidden.

**Dependencies:** 06.1, Epic 03.
**Status:** drafted

### Story 06.4 — Card 3: Net worth & savings rate
**As a** user
**I want** a single net-worth number and current savings rate
**So that** I have a one-glance health check.

**Acceptance criteria:**
- [ ] AC-1: Hero number: current net worth = Σ account balances + Σ investment current_value − Σ loan balances.
- [ ] AC-2: 12-month sparkline of month-end net worth below the number.
- [ ] AC-3: Below: savings-rate % for selected month with delta vs. prior month (+/−).
- [ ] AC-4: Monthly flow waterfall: Opening → +Income → −Expense → +Investment Gains → Closing.
- [ ] AC-5: Credit card outstanding is treated as a liability in net worth.

**Dependencies:** 06.1, Epic 02, Epic 03, Epic 04.
**Status:** drafted

### Story 06.5 — Card 4: Portfolio snapshot
**As a** user
**I want** to see asset allocation and top holdings on the dashboard
**So that** I monitor portfolio without opening a separate page.

**Acceptance criteria:**
- [ ] AC-1: Donut of asset allocation by asset class (Equity = MF + Stocks; Debt = FD + PPF + EPF; Alt = Crypto + Gold; Real estate).
- [ ] AC-2: Below donut: top 5 holdings by current value, with name + current value + XIRR.
- [ ] AC-3: "View all" → `/investments` page.
- [ ] AC-4: Shows last-refreshed timestamp + stale-data indicator if >48 hours old.
- [ ] AC-5: Empty state for users with zero holdings.

**Dependencies:** 06.1, Epic 04.
**Status:** drafted

### Story 06.6 — Dashboard performance optimization
**As a** user
**I want** the dashboard to load in under 1 second on desktop and under 2 seconds on mobile
**So that** it doesn't feel sluggish.

**Acceptance criteria:**
- [ ] AC-1: Dashboard data fetched in parallel (one aggregate server action per card).
- [ ] AC-2: Use Server Components where possible; client components only for interactive charts.
- [ ] AC-3: Aggregate queries indexed appropriately (use EXPLAIN ANALYZE).
- [ ] AC-4: Lighthouse performance score ≥85 on mobile for dashboard page.

**Dependencies:** 06.2, 06.3, 06.4, 06.5.
**Status:** drafted

---

## Data model impact

None new — this epic is read-only. May introduce indices / materialized views if needed after performance profiling.

Potential index additions (assess during 06.6):
- `transactions(user_id, txn_date, type)` — for monthly aggregations.
- `transactions(user_id, category_id, txn_date)` — for category breakdowns.

---

## API surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dashboard?month=YYYY-MM` | Aggregated payload for all 4 cards (single round-trip) |
| GET | `/api/dashboard/category-breakdown?month=...` | For drill re-renders |
| GET | `/api/dashboard/trend?months=12&end=...` | 12-month trend |
| GET | `/api/dashboard/networth` | Snapshot + sparkline |
| GET | `/api/dashboard/portfolio` | Allocation + top holdings |

---

## UX references

- Overall dashboard layout (mobile + desktop) → `front-end-spec.md § Dashboard`
- Each card wireframe → `front-end-spec.md § Dashboard · Card 1/2/3/4`
- Drill interactions → `front-end-spec.md § Dashboard · Drills`
- Empty states → `front-end-spec.md § Empty States`

---

## Risks

- **Chart library choice.** Recharts is good enough but can hit edges with odd data. **Mitigation:** one place to swap chart lib; isolate inside `components/charts/`.
- **Net worth is a composite of many sources** — easy to double-count or miss. **Mitigation:** pure `computeNetWorth(userId, asOf)` function with exhaustive unit tests.
- **Color accessibility.** Red/green is the default but fails for colorblind users. **Mitigation:** also use shape / position to convey state; add patterns in v1.5.
- **Performance at scale.** With 5 years of data the aggregates get slow. **Mitigation:** monthly materialized summary view if profiling shows >500ms.

---

## Definition of done (epic-level)

- [ ] All 6 stories `done`.
- [ ] All 4 cards render correctly on mobile and desktop with real data.
- [ ] Drill-downs work on each card.
- [ ] Empty states are friendly and actionable.
- [ ] Dashboard loads <1s desktop, <2s mobile.
- [ ] Net-worth computation matches manual reconciliation ±2%.
- [ ] `CHANGELOG.md` has Epic 06 entry.
