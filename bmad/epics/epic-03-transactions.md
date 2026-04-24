# Epic 03 — Transactions (Expenses, Income, Categories)

**Status:** drafted
**Owner:** Tushar
**Depends on:** Epic 01 (auth), Epic 02 (accounts)
**Unblocks:** Epic 05 (budgets), Epic 06 (dashboard), Epic 07 (import)
**Estimated duration:** ~1.5 weeks

---

## Why this epic exists

Transactions are the **heartbeat of the app**. Every dashboard number, every budget progress bar, every trend chart is aggregated from this table. This epic ships the core daily interaction loop — **log an expense / income in under 15 seconds** — and the category system that organizes them.

The quality bar is brutal: if expense entry isn't delightful on mobile, users silently stop logging and the entire app's value collapses.

---

## Scope — in

- Unified `transactions` table for `EXPENSE`, `INCOME`, and `TRANSFER`.
- Quick entry flow (mobile-optimized, ≤15 seconds to save).
- Detailed entry with tags, notes, receipt upload (upload → v1.5; schema ready).
- Transfer between own accounts (modeled as paired transactions via `transfer_group_id`).
- Default category seeds (India-relevant).
- Custom category management (create, edit, archive).
- Income type classification (salary / dividend / interest / other).
- Transaction list with filter by date range, account, category, type.
- Transaction edit + delete.
- Search by description / merchant.

## Scope — out

- ❌ Recurring transactions (v1.5).
- ❌ Receipt image upload (schema ready; UI in v1.5).
- ❌ Split transactions (one bill, multiple categories) — v1.5.
- ❌ Saved filter views (v1.5).
- ❌ Tag cloud UI (v2).

---

## User stories

### Story 03.1 — Quick expense entry (mobile-optimized)
**As a** user
**I want** to log an expense in under 15 seconds on my phone
**So that** I actually log transactions in the moment.

**Acceptance criteria:**
- [ ] AC-1: Floating "+" button accessible from every screen of `(finance)`.
- [ ] AC-2: Form opens as a bottom sheet with numeric keypad pre-focused and visible.
- [ ] AC-3: Category and Account default to last-used values per user.
- [ ] AC-4: Saving requires only: amount > 0, category, account. Note + date are optional.
- [ ] AC-5: On save, toast confirms `Saved ₹X to {Category}` and sheet closes.
- [ ] AC-6: Median save time in my own usage <15 seconds (self-measured).

**Dependencies:** Epic 02 done, default categories seeded (03.4).
**Status:** drafted

### Story 03.2 — Detailed expense entry
**As a** user
**I want** an expanded form with optional fields
**So that** I can capture notes, merchant, and tags when I care.

**Acceptance criteria:**
- [ ] AC-1: Toggle from quick-entry to detailed view.
- [ ] AC-2: Additional fields: merchant, note, tags (multi-select), date picker.
- [ ] AC-3: All validation inherited from 03.1.
- [ ] AC-4: Schema reserves `attachment_url` for future receipt upload (NULL in v1).

**Dependencies:** 03.1
**Status:** drafted

### Story 03.3 — Income entry with classification
**As a** user
**I want** to log income with a type (salary / dividend / interest / other)
**So that** analytics can distinguish active from passive income.

**Acceptance criteria:**
- [ ] AC-1: Entry form accessed via "+" → "Income" tab.
- [ ] AC-2: Required: amount, account (credited to), income type, date.
- [ ] AC-3: Income types: `SALARY`, `BUSINESS`, `DIVIDEND`, `INTEREST`, `RENTAL`, `CAPITAL_GAIN`, `GIFT`, `REFUND`, `OTHER`.
- [ ] AC-4: `SALARY` entries can optionally tag an "employer" string.
- [ ] AC-5: Dividend / interest entries can optionally tag an `investment_holding_id` (for linking to portfolio in Epic 04) — nullable in v1.

**Dependencies:** 03.1
**Status:** drafted

### Story 03.4 — Default category seeding
**As a** user
**I want** sensible default categories on signup
**So that** I don't have to define 20 categories before logging anything.

**Acceptance criteria:**
- [ ] AC-1: On first login, `public.categories` is seeded with a default set (see list below).
- [ ] AC-2: Default categories have `user_id = NULL` (system-level), visible to all users.
- [ ] AC-3: Users can hide defaults (via category_preferences) but not delete them.

**Default expense categories:** Food & Dining, Groceries, Transport, Fuel, Utilities, Rent, Mobile & Internet, Health, Fitness, Shopping, Entertainment, Subscriptions, Travel, Education, Gifts & Donations, Personal Care, Home, Taxes, Fees & Charges, Other.

**Default income categories:** Salary, Freelance, Dividend, Interest, Rental, Capital Gains, Gift, Refund, Other.

**Dependencies:** Epic 01
**Status:** drafted

### Story 03.5 — Custom category management
**As a** user
**I want** to create, edit, and archive my own categories
**So that** the taxonomy fits my life.

**Acceptance criteria:**
- [ ] AC-1: Category page lists defaults + user-created categories.
- [ ] AC-2: Create: name (unique per user), type (EXPENSE/INCOME), parent category (optional), color, icon.
- [ ] AC-3: Edit: name, color, icon, parent. Cannot change type.
- [ ] AC-4: Archive sets `is_archived = true`; category hidden from forms but preserved for historical txns.
- [ ] AC-5: Deleting not allowed if category has associated transactions; archive is the path.

**Dependencies:** 03.4
**Status:** drafted

### Story 03.6a — Transaction list with basic filters
**As a** user
**I want** to view all my transactions with date/account/category/type filters
**So that** I can review history.

**Acceptance criteria:**
- [ ] AC-1: List paginated (50 per page).
- [ ] AC-2: Filters: date range (default: current month), account, category, type.
- [ ] AC-3: Each row: date, category icon + name, account, amount (red for expense, green for income), note preview.
- [ ] AC-4: Click row → detail view.
- [ ] AC-5: Performs <500ms for up to 10,000 transactions (test with seeded data).

**Dependencies:** 03.1, 03.3
**Status:** drafted

### Story 03.6b — Search by description / merchant
**As a** user
**I want** to search transactions by note or merchant
**So that** I can find specific spending.

**Acceptance criteria:**
- [ ] AC-1: Search box at top of transaction list.
- [ ] AC-2: Searches `description` + `merchant` (case-insensitive, partial match).
- [ ] AC-3: Search combines with active filters.
- [ ] AC-4: Results update within 300ms of typing.

**Dependencies:** 03.6a
**Status:** drafted

### Story 03.7 — Edit transaction
**As a** user
**I want** to edit any field of a saved transaction
**So that** I can correct mistakes without deleting and re-entering.

**Acceptance criteria:**
- [ ] AC-1: Detail view has "Edit" action.
- [ ] AC-2: All fields editable: amount, category, account, date, note, merchant, tags.
- [ ] AC-3: Changes persist and reflect immediately in lists and dashboards.
- [ ] AC-4: Edit log (optional v1.5) — for v1, just trust the user; no audit trail.

**Dependencies:** 03.6a
**Status:** drafted

### Story 03.8 — Delete transaction
**As a** user
**I want** to delete a transaction
**So that** I can remove duplicates or erroneous entries.

**Acceptance criteria:**
- [ ] AC-1: Detail view has "Delete" with confirmation.
- [ ] AC-2: Delete is hard-delete (no soft-delete in v1 for transactions).
- [ ] AC-3: Affected aggregations (dashboard, budgets) update on next load.

**Dependencies:** 03.6a
**Status:** drafted

### Story 03.9 — Transfer between own accounts
**As a** user
**I want** to record a transfer (e.g., HDFC → ICICI)
**So that** it doesn't double-count as an expense+income.

**Acceptance criteria:**
- [ ] AC-1: "+" → "Transfer" tab.
- [ ] AC-2: Fields: from account, to account, amount, date, optional note.
- [ ] AC-3: On save, creates two rows in `transactions`, **both typed `TRANSFER`**, linked by a shared `transfer_group_id`. One row is debited from the source account (affects that account's balance negatively), one is credited to the destination account. Per ADR-0005.
- [ ] AC-4: Transfers are EXCLUDED from expense/income analytics via `WHERE type IN ('EXPENSE','INCOME')`. The central `transactionsForAnalytics()` helper enforces this; no route or query may bypass it. Per ADR-0005.
- [ ] AC-5: Deleting one half of the pair deletes the other (cascade by `transfer_group_id`).

**Dependencies:** 03.1, 03.3
**Status:** drafted

---

## Data model impact

```prisma
model Category {
  id               String     @id @default(uuid())
  userId           String?    @map("user_id")  // nullable for system defaults
  name             String
  type             TxnType
  parentCategoryId String?    @map("parent_category_id")
  color            String?
  icon             String?
  isArchived       Boolean    @default(false) @map("is_archived")

  parent           Category?  @relation("SubCategory", fields: [parentCategoryId], references: [id])
  children         Category[] @relation("SubCategory")
  transactions     Transaction[]
}

model Transaction {
  id               String    @id @default(uuid())
  userId           String    @map("user_id")
  accountId        String    @map("account_id")
  categoryId       String    @map("category_id")
  type             TxnType
  amount           Int       // paise
  txnDate          DateTime  @map("txn_date")
  description      String?
  merchant         String?
  tags             String[]
  incomeType       IncomeType? @map("income_type")
  transferGroupId  String?   @map("transfer_group_id")
  attachmentUrl    String?   @map("attachment_url")
  source           TxnSource @default(MANUAL)
  metadata         Json      @default("{}")
  createdAt        DateTime  @default(now()) @map("created_at")

  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  account          Account   @relation(fields: [accountId], references: [id])
  category         Category  @relation(fields: [categoryId], references: [id])

  @@index([userId, txnDate])
  @@index([userId, categoryId, txnDate])
  @@index([transferGroupId])
}

enum TxnType { EXPENSE INCOME TRANSFER }
enum IncomeType { SALARY BUSINESS DIVIDEND INTEREST RENTAL CAPITAL_GAIN GIFT REFUND OTHER }
enum TxnSource { MANUAL IMPORT WHATSAPP RECURRING }
```

---

## API surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/transactions` | Create (handles all 3 types incl. transfer pair) |
| GET | `/api/transactions` | List with filters, search, pagination |
| GET | `/api/transactions/[id]` | Detail |
| PATCH | `/api/transactions/[id]` | Edit |
| DELETE | `/api/transactions/[id]` | Delete (transfer pair deletes together) |
| POST | `/api/categories` | Create |
| GET | `/api/categories` | List (user + defaults) |
| PATCH | `/api/categories/[id]` | Edit |
| POST | `/api/categories/[id]/archive` | Archive |

All write endpoints accept a **structured intent** shape reusable by the WhatsApp bot later.

---

## UX references

- Quick entry bottom sheet → `front-end-spec.md § Quick Expense Entry`
- Detailed entry → `front-end-spec.md § Detailed Entry`
- Transaction list + search → `front-end-spec.md § Transaction List`
- Category management → `front-end-spec.md § Categories`

---

## Risks

- **Category proliferation:** users create 40 micro-categories, destroying analytics. **Mitigation:** default set is well-designed; no hard limit but UI discourages via gentle hints.
- **Transfer double-count bugs:** missed `transfer_group_id` filters in aggregations. **Mitigation:** central `transactionsForAnalytics()` helper used everywhere; unit-test it.
- **Mobile UX regression:** 15-second target is easy to lose on small iterations. **Mitigation:** automated perf measurement in Playwright.
- **Edit/delete without audit trail:** if I misedit I lose data. **Mitigation:** accepted risk for v1; backup via Supabase daily snapshots.

---

## Definition of done (epic-level)

- [ ] All 10 stories `done`.
- [ ] I can log expense, income, and transfer without errors.
- [ ] Transfer does not double-count in analytics.
- [ ] Quick entry on mobile meets <15s target.
- [ ] Default categories appear on fresh signup.
- [ ] Transaction list + search + filters work correctly with 1000+ rows.
- [ ] Edit and delete behave as specified.
- [ ] `CHANGELOG.md` has Epic 03 entry.
