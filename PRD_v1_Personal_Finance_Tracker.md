# PRD — Personal Finance Tracker (v1)
*Expense + Investment Tracker, foundation for a broader Personal OS*

| Field | Value |
|---|---|
| **Author** | Tushar Bhardwaj (Product Owner), drafted with Claude |
| **Status** | Draft for review |
| **Version** | 0.1 |
| **Last updated** | 2026-04-24 |
| **Target launch (v1)** | ~8 weeks from kickoff |

---

## 1. Vision

Replace a clunky Excel-based money tracker with a **single, input-driven web app** that gives me real-time visibility into where my money is going, where it's parked, and whether I'm on track — and becomes the foundation for a broader personal-life OS (calories, body, projects, utilities) over the next 6–12 months.

Every feature in v1 must survive a single test: **"Does this still make sense when I'm entering data via a WhatsApp message instead of a form?"** If not, rethink it.

---

## 2. Problem statement

Today I track income, expenses, and investments in an Excel sheet. Problems:

1. **Entry friction** — opening a sheet on mobile is painful; I batch-enter at month-end and forget details.
2. **No live portfolio** — Excel shows what I invested, not what it's worth now. I log into 4 different apps (Zerodha, Groww, bank, crypto exchange) to reconcile.
3. **No analytics** — I have the data but no trend view, no category breakdown, no savings rate, no net worth snapshot.
4. **No budgets / guardrails** — I don't know I'm overspending until I review the month.
5. **Fragmented** — none of this connects to my other personal tracking (meals, body, projects) that I also want to do.

---

## 3. Goals & non-goals

### 3.1 Goals (v1)
- **G1.** Capture income and expenses in <15 seconds per entry from phone or laptop.
- **G2.** Give a live snapshot of **net worth** = cash balance + investment current value − liabilities.
- **G3.** Show the 4 dashboard views I actually care about: category breakdown, trend, savings rate / net worth, portfolio performance.
- **G4.** Let me set monthly budgets per category and alert me at 80% / 100%.
- **G5.** Import my existing Excel history so analytics are useful from day 1.
- **G6.** Be API-first so WhatsApp integration (v2) and future modules are additive, not rewrites.

### 3.2 Non-goals (v1) — explicit to prevent scope creep
- ❌ WhatsApp / Telegram message entry (this is **v2**).
- ❌ Tax computation, capital gains reports, 80C planner.
- ❌ Bill payment / UPI integration.
- ❌ Multi-user / sharing with spouse / family.
- ❌ Bank SMS scraping or email parsing.
- ❌ Calorie, body, project-expense modules (**v3+**; schema supports them but no UI).
- ❌ Recurring transactions (salary on 1st, SIPs on 7th) — pushed to **v1.5**.
- ❌ Mobile native app (PWA is sufficient).
- ❌ Real estate price discovery (manual value updates only).

### 3.3 Success metrics (measured 60 days post-launch)
- I log ≥90% of transactions within 24 hours of them happening (vs. ~30% in Excel today).
- Dashboard opens ≥4x/week.
- ≥1 spending decision per month influenced by a budget alert.
- Zero manual reconciliation against bank statements (portfolio current value matches reality ±2%).

---

## 4. Target user & persona

**Primary (and only) user: Tushar.**
- Works in analytics/data domain. Comfortable with technical UX.
- Holds a mix of Indian retail investments: MFs (SIPs + lumpsum), direct stocks, FD/RD/PPF/EPF, crypto, gold (digital/physical), possibly real estate.
- INR-denominated. India time zone (IST).
- Uses both desktop (for analytics, monthly review) and mobile (for quick expense entry).

---

## 5. Scope overview — v1 feature list

| # | Feature | Priority | Notes |
|---|---|---|---|
| F1 | User signup/login (Google OAuth + Magic Link + Email/Password) | P0 | Supabase Auth handles all three |
| F2 | Accounts module (bank, cards, wallets) | P0 | Foundation for every transaction |
| F3 | Expense entry (quick + detailed) | P0 | Core flow |
| F4 | Income entry (with income type: salary, dividend, interest, other) | P0 | |
| F5 | Category management (default + custom) | P0 | India-specific defaults |
| F6 | Investment ledger (contributions + withdrawals) across all asset types | P0 | |
| F7 | Investment live valuation — MF NAV, stocks, crypto (auto) | P0 | Via external APIs |
| F8 | Investment valuation — FD/RD/PPF/EPF (deterministic formula) | P0 | No API needed |
| F9 | Investment valuation — gold, real estate, other (manual) | P1 | Manual value update UI |
| F10 | Monthly budgets per category + overspend alerts | P0 | In-app + email |
| F11 | Dashboard with 4 views (category breakdown, trend, savings/net worth, portfolio) | P0 | |
| F12 | Excel / CSV importer for historical data | P0 | Column-mapping UI |
| F13 | Search & filter transactions | P1 | |
| F14 | Export to CSV | P1 | |
| F15 | Settings (currency, financial year start, default account) | P1 | INR + April FY start for Indian context |

**Explicitly v1.5 / v2:**
- Recurring transactions (v1.5)
- WhatsApp bot (v2)
- Reports / PDF monthly summary (v2)
- Additional modules: calories, body, project expense (v3+)

---

## 6. Data model (draft)

Designed to be **multi-module-ready from day 1** (middle-ground choice you picked) — the schema supports future modules, but the UI in v1 only surfaces expenses + investments.

```
─── Identity & multi-module foundation ──────────────
users                 id, email, name, auth_provider, created_at, fy_start_month (4=April)
user_settings         user_id, currency (INR), locale, timezone, notification_prefs

─── Accounts (bank/card/wallet) ──────────────────────
accounts              id, user_id, name ("HDFC Savings"), type (SAVINGS|CURRENT|CREDIT_CARD|CASH|UPI_WALLET|LOAN),
                      institution, opening_balance, opening_balance_date,
                      credit_limit (nullable, for credit cards), statement_day (nullable),
                      is_active, archived_at

─── Categories ───────────────────────────────────────
categories            id, user_id (nullable for system defaults), name, type (EXPENSE|INCOME),
                      parent_category_id (for sub-categories), color, icon, is_archived

─── Transactions (expenses + income; unified table) ──
transactions          id, user_id, account_id, category_id,
                      type (EXPENSE|INCOME|TRANSFER),
                      amount, currency, txn_date, description, merchant,
                      tags[], attachment_url (receipts, optional),
                      created_at, source (MANUAL|IMPORT|WHATSAPP|RECURRING),
                      metadata jsonb

─── Investments ──────────────────────────────────────
investment_holdings   id, user_id, asset_class (MUTUAL_FUND|STOCK|FD|RD|PPF|EPF|CRYPTO|GOLD|REAL_ESTATE|OTHER),
                      name ("Parag Parikh Flexi Cap"), identifier (ISIN / ticker / scheme_code),
                      account_id (which broker/bank), status (ACTIVE|CLOSED|MATURED),
                      metadata jsonb  -- asset-class-specific (interest_rate for FD, quantity for stock, etc.)

investment_txns       id, holding_id, txn_type (BUY|SELL|SIP|DIVIDEND|INTEREST|BONUS|WITHDRAWAL|MATURITY),
                      units, price_per_unit, amount, txn_date, notes

asset_prices          id, identifier, asset_class, date, price, source (AMFI|YAHOO|COINGECKO|MANUAL)
                      -- daily price cache to avoid re-hitting APIs

holding_valuations    id, holding_id, as_of_date, invested_amount, current_value,
                      realized_gain, unrealized_gain, xirr
                      -- materialized snapshot updated by a daily job

─── Budgets ──────────────────────────────────────────
budgets               id, user_id, category_id, month (YYYY-MM), amount,
                      alert_thresholds[] (default [0.8, 1.0])

budget_alerts_sent    budget_id, threshold, sent_at  -- dedupe alert emails

─── Future modules (schema reserved, no UI in v1) ────
-- modules table: id, user_id, module_type (FINANCE|NUTRITION|BODY|PROJECT), enabled_at
-- nutrition_entries, body_measurements, project_expenses … deferred
```

### Key design decisions & rationale
- **Transactions table unifies income + expense + transfer.** A transfer (moving money HDFC → ICICI) is modeled as a pair of transactions linked by a `transfer_group_id`. Avoids double-counting in totals.
- **`investment_txns` is event-sourced.** Current holdings are derived by replaying events (units_held = SUM(BUY) − SUM(SELL)). Auditable, correctible.
- **`holding_valuations` is a snapshot table.** A nightly cron job fetches prices and writes valuations so dashboards are O(1) read, not O(n) recompute.
- **`source` on transactions** tracks origin (manual/import/whatsapp) so we can debug v2 issues.
- **`metadata jsonb`** on investments lets each asset class carry what it needs (interest rate for FD, strike price for stocks, carat/weight for gold) without schema explosion.

---

## 7. Key user flows

### 7.1 Quick expense entry (most frequent flow — optimize hard)
**Goal: <15 seconds on mobile, 3 taps max.**

```
Home  →  "+" FAB  →  Quick Entry sheet
                      ┌─────────────────────────┐
                      │ [200]      [₹]          │ ← amount keypad always-open
                      │ Category: Food 🍔 ▾     │ ← last-used auto-selected
                      │ Account:  HDFC CC ▾     │ ← last-used auto-selected
                      │ Note:     (optional)    │
                      │ Date:     Today ▾       │
                      │         [Save]          │
                      └─────────────────────────┘
```
Smart defaults: last-used category + account; today's date; amount keypad pre-focused.

### 7.2 Detailed expense entry
Same form + expandable sections for receipt upload, tags, merchant, split (future).

### 7.3 Investment entry
Two step: **(1)** pick or create a holding → **(2)** add a transaction (BUY/SIP/DIVIDEND/SELL).
Smart behaviors:
- If asset class = Mutual Fund and user types scheme name, autocomplete from cached AMFI scheme list.
- If stock, autocomplete ticker from NSE symbol list.
- For FD/RD/PPF: enter principal + interest rate + start/maturity date → system computes current accrued value deterministically.

### 7.4 Excel import
1. Upload `.xlsx` / `.csv`.
2. Pick sheet (for xlsx) and header row.
3. Column mapper UI: system auto-guesses, user confirms/edits (Date → `txn_date`, Amount → `amount`, etc.).
4. Category mapping: unknown categories prompt to create or merge.
5. Dry-run preview (first 20 rows).
6. Confirm → import with a single rollback option.

### 7.5 Dashboard open (desktop)
Landing view = **4 cards** (matching your 4 chosen insights):
1. **Category breakdown** — donut chart, this month, drill to transaction list.
2. **Trend** — last 12 months bar chart (income vs. expense vs. savings rate).
3. **Net worth** — single number + 12-month spark line. Below: income − expense waterfall for selected month.
4. **Portfolio** — allocation donut (by asset class) + table of holdings with invested / current / absolute return / XIRR / % of portfolio.

Header: month picker (default = current month). Compact on mobile (stacked cards, swipeable).

### 7.6 Budget set-up & alert
1. Settings → Budgets → pick category → set monthly amount.
2. Dashboard category card shows **progress bar** per budgeted category.
3. When `month_to_date_spend ≥ 0.8 × budget`: in-app notification + email.
4. At 100%: stronger warning; category card turns red on dashboard.

---

## 8. Tech architecture

### 8.1 Stack
- **Frontend:** Next.js 15 (App Router) + React Server Components + TypeScript + Tailwind + shadcn/ui.
- **Backend:** Next.js API routes / Server Actions (API-first from day 1; same endpoints usable by the WhatsApp bot in v2).
- **Database:** Supabase Postgres.
- **ORM:** Prisma (pointed at Supabase's connection pooler).
- **Auth:** Supabase Auth (Google OAuth + Magic Link + Email/Password — all three enabled, user picks on login screen).
- **Charts:** Recharts (sufficient for v1; swap to Visx/D3 if needed later).
- **Deployment:** Vercel (frontend + APIs). Supabase free tier → $25 Pro if needed.
- **Scheduled jobs:** Vercel Cron (nightly price refresh, valuation snapshots, budget-alert checks).
- **Email:** Resend (budget alerts, magic links via Supabase).
- **Monitoring:** Vercel Analytics + Sentry (free tier).

### 8.2 External API dependencies (price feeds)
| Asset class | Source | Cost | Latency | Notes |
|---|---|---|---|---|
| Mutual Funds | AMFI India daily NAV file | Free | ~daily at 11pm IST | Pull once/day, parse, upsert |
| Stocks (NSE/BSE) | Yahoo Finance unofficial / Alpha Vantage / Zerodha Kite | Free (Yahoo) / $0 (AV has free tier) | Real-time to 15-min delayed | Yahoo is fragile — cache aggressively, build fallback |
| Crypto | CoinGecko free API | Free, 50 calls/min | Live | Well-documented, stable |
| Gold | MetalPriceAPI or manual | Free (100/mo) / manual | Daily | Manual is fine for v1 |
| FD/RD/PPF/EPF | Deterministic formula | — | — | No API; compute current value from rate + date |
| Real estate | Manual | — | — | User updates quarterly |

**Architectural rule:** no frontend ever calls these APIs directly. All price-fetch logic lives in a single `PriceProvider` service with per-source adapters, queued via Vercel Cron. Cached in `asset_prices` table. If a source fails, last-known price is used and a flag surfaces in UI.

### 8.3 Multi-module foundation (middle-ground you picked)
- DB schema includes a `modules` table (`FINANCE`, `NUTRITION`, `BODY`, `PROJECT`). Only `FINANCE` is enabled in v1.
- Next.js route structure: `/app/(finance)/...` now, `/app/(nutrition)/...` added later — no refactor needed.
- Shared: auth, settings, notification system, import framework, analytics primitives.

### 8.4 WhatsApp-readiness (non-functional requirement)
Every write operation in v1 must go through an API endpoint that accepts a **structured intent**, e.g.:
```
POST /api/transactions
{ type: "EXPENSE", amount: 200, category: "Food", account: "HDFC CC", note: "Zomato" }
```
Server validates + persists. In v2, a WhatsApp webhook parses "spent 200 on zomato from hdfc cc" → same intent → same endpoint. Zero duplication.

---

## 9. Analytics spec (precise, no hand-waving)

### Dashboard Card 1 — "Where is my money going?"
- **View:** Donut chart, category breakdown, selected month.
- **Drill:** Click slice → filtered transaction list.
- **Computation:** `SUM(amount) GROUP BY category WHERE type=EXPENSE AND txn_date IN [month]`.
- **Empty state:** "Log your first expense to see this."

### Dashboard Card 2 — "Am I spending more or less over time?"
- **View:** Bar chart, last 12 months, stacked (income green, expense red), line overlay = savings rate %.
- **Metric:** `savings_rate_pct = (income - expense) / income * 100`.
- **Annotations:** highlight months where savings rate dropped >10pp vs 3-month avg.

### Dashboard Card 3 — "Savings rate & net worth"
- **Primary metric:** `net_worth = Σ(account_balance) + Σ(investment.current_value) − Σ(liability_account.balance)`.
- **Secondary:** 12-month sparkline of net worth.
- **Monthly flow:** waterfall chart (opening balance → +income → −expense → +investment gains → closing balance).

### Dashboard Card 4 — "Portfolio performance"
- **Allocation donut:** by asset class (% of total current value).
- **Holdings table:** name, invested, current, absolute return ₹, absolute return %, **XIRR %**, % of portfolio.
- **XIRR computation:** scipy-style Newton's method on `investment_txns` cashflows, one row per holding. Run nightly, cached in `holding_valuations`.

### "What I explicitly won't build in v1"
- Asset-class heatmaps.
- Tax-harvesting suggestions.
- Goal tracking ("retire by 50").
- Benchmark comparisons (fund vs. index).

---

## 10. Budget module spec

- **Scope in v1:** monthly only (no weekly/yearly).
- Per-category, per-month budget. Rolling-over unused budget = **not in v1**.
- Alert thresholds: hard-coded 80% + 100% for v1 (user-configurable in v1.5).
- **Delivery:** in-app banner on dashboard + email via Resend.
- **Dedupe:** one email per threshold per month (tracked in `budget_alerts_sent`).

---

## 11. Roadmap

### **v1 — Foundation (~8 weeks)**
Weeks 1–2: auth, accounts, transactions, categories, basic UI shell.
Weeks 3–4: investment ledger + live valuation pipeline (MF + stock + crypto).
Weeks 5–6: dashboard (4 cards), budgets + alerts.
Weeks 7–8: Excel import, polish, bug bash, beta test (me, for 2 weeks).

### **v1.5 — Quality of life (~2 weeks after v1)**
- Recurring transactions (salary/SIP/rent/subscription templates).
- Configurable budget thresholds, weekly/yearly budgets.
- Transaction search, CSV export.
- Receipt image upload (Supabase Storage).
- Goal tracking (savings goals).

### **v2 — WhatsApp integration (~3 weeks)**
- WhatsApp Business Cloud API webhook.
- Intent parser (LLM-backed: "paid 200 to zomato from hdfc cc" → structured intent).
- Confirmation flow ("Log ₹200 Food from HDFC CC? [Yes/No]").
- Daily/weekly digest via WhatsApp ("You spent ₹4.2k this week, 18% over budget on Food").

### **v3+ — Personal OS modules (each ~3–5 weeks)**
- Nutrition / calorie tracker (with WhatsApp "ate 2 rotis + dal" parsing).
- Body tracker (weight, body fat, measurements, with trends).
- Project expense tracker (tag expenses by project, ROI view).
- Utility pack (bill due reminders, document vault).

---

## 12. Risks & open questions

### Risks
| Risk | Severity | Mitigation |
|---|---|---|
| Yahoo Finance unofficial API breaks / rate-limits | Medium | Adapter pattern; fallback to Alpha Vantage (250 calls/day free); surface last-known price age in UI |
| Supabase free tier limits (500MB DB, 2GB bandwidth) hit early | Low | Unlikely at 1 user; upgrade to Pro ($25/mo) if needed |
| WhatsApp Business API approval / costs for v2 | Medium | Deferred; investigate in v1.5 buffer |
| Excel importer edge cases (inconsistent formats, merged cells) | Medium | Strict input validation, dry-run preview, clear error messages |
| XIRR computation performance across many holdings | Low | Nightly cron, cached in table, not computed on read |
| Data loss from bad import / bad delete | High | All writes audit-logged; daily Supabase backups; "undo last import" action |

### Open questions (I need answers before kickoff)
1. **Excel migration — can I see your current sheet?** Its structure will directly inform category defaults and the importer's column-mapping heuristics. If you can share (or redact and share), I'll embed a concrete column map in v0.2 of this PRD.
2. **Liabilities** — do you track active loans (home loan, car, personal loan) and want them in net worth? Schema supports it; deciding UX.
3. **Net worth precision** — should credit card *outstanding* reduce net worth in real time (default: yes)? Most people forget this.
4. **Crypto exchanges** — any specific (WazirX, CoinDCX, Binance)? Affects whether we can auto-import txns in a later version.
5. **Dividend / interest income** — treat as *income* (shows in savings rate) or as *investment return* (rolls into portfolio returns only)? Accountants disagree; I lean toward **both** — post as income **and** tag against holding.
6. **Financial year** — India's April–March. Confirming this so reports align with tax filing.
7. **Shared Google account?** — if you share finances with a partner, shared-login vs. separate-accounts matters.
8. **Time-budget for you** — are you hands-on building this, or fully delegating? If the former, I'll pair this PRD with a staged engineering plan.

---

## 13. Appendix — v1 acceptance checklist

Before we call v1 "done":

- [ ] I can sign up via Google, magic link, or email/password.
- [ ] I can add 3 accounts (savings, credit card, cash) with opening balances.
- [ ] I can log an expense in <15 seconds on mobile.
- [ ] I can log an income with income type (salary/dividend/other).
- [ ] I can log an investment txn across all 6 asset classes.
- [ ] MF + stock + crypto current values auto-refresh daily.
- [ ] FD/PPF/EPF current values compute correctly from formulas.
- [ ] I can import my existing Excel history and categories map cleanly.
- [ ] Dashboard renders all 4 cards correctly on desktop and mobile.
- [ ] I can set a monthly Food budget and get an email when I hit 80%.
- [ ] Net worth number matches my actual across bank + investment apps (±2%).
- [ ] Zero JS errors in Sentry for 7 consecutive days.

---

*End of PRD v0.1. Awaiting your responses to Section 12 open questions before moving to engineering plan.*
