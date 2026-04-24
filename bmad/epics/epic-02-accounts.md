# Epic 02 — Accounts (Banks, Cards, Wallets)

**Status:** drafted
**Owner:** Tushar
**Depends on:** Epic 01 (auth)
**Unblocks:** Epic 03 (transactions reference accounts), Epic 04 (investments reference accounts)
**Estimated duration:** ~3 days

---

## Why this epic exists

An expense isn't just "₹200 on food" — it's "₹200 on food **from HDFC Credit Card**." Tracking the source/destination account is what turns the app from a budget journal into a real cashflow tool. Without accounts, users can't see balances, reconcile against banks, or understand credit-card liability.

This epic establishes the concept of **accounts** (liquid + credit + loan) that every transaction and investment will later reference.

---

## Scope — in

- CRUD for accounts (create, list, edit, archive).
- Account types: `SAVINGS`, `CURRENT`, `CREDIT_CARD`, `CASH`, `UPI_WALLET`, `LOAN`.
- Opening balance with opening-balance date.
- Credit card fields: `credit_limit`, `statement_day`.
- Loan fields: `principal`, `interest_rate`, `tenure_months`, `emi_amount`.
- Account archive (soft-delete — don't lose history).
- Onboarding nudge: new user sees a prompt to add their first account before logging transactions.

## Scope — out

- ❌ Automatic bank-account linking / Plaid-style integrations (never in India retail anyway).
- ❌ SMS-based balance parsing.
- ❌ Multi-currency accounts (INR only in v1).
- ❌ Joint accounts / shared ownership.

---

## User stories

### Story 02.1 — Create an account
**As a** user
**I want** to add a new account with type and opening balance
**So that** I can tag transactions to it.

**Acceptance criteria:**
- [ ] AC-1: Form accepts: name (required), type (enum), institution (optional string), opening balance (number, can be 0 or negative for loans), opening balance date (defaults to today).
- [ ] AC-2: When type = `CREDIT_CARD`, form additionally asks for credit limit and statement day (1–31).
- [ ] AC-3: When type = `LOAN`, form asks for principal, interest rate %, tenure months, EMI amount.
- [ ] AC-4: On save, row is inserted in `accounts` with `user_id = auth.uid()`.
- [ ] AC-5: Validation: name is required and unique per user; numeric fields validated; statement_day 1–31.

**Dependencies:** Epic 01 done.
**Status:** drafted

### Story 02.2 — List & view accounts
**As a** user
**I want** to see all my accounts with current balances
**So that** I have a snapshot of liquid position.

**Acceptance criteria:**
- [ ] AC-1: Accounts page groups by type (Bank / Cards / Wallets / Loans).
- [ ] AC-2: Each card shows name, institution, and current computed balance (opening balance + net transactions — to be wired up after Epic 03; until then, shows opening balance).
- [ ] AC-3: Credit card cards show outstanding + available credit (once transactions exist).
- [ ] AC-4: Loan cards show remaining principal and months left.
- [ ] AC-5: Total net cash shown at top (sum of positive balances − loan outstanding).

**Dependencies:** 02.1 (and retro-wired to 03.1 for balance computation)
**Status:** drafted

### Story 02.3 — Edit an account
**As a** user
**I want** to edit an account's metadata
**So that** I can fix typos or update credit limits.

**Acceptance criteria:**
- [ ] AC-1: Editable: name, institution, credit_limit, statement_day.
- [ ] AC-2: NOT editable: type (immutable once transactions exist), opening balance (immutable).
- [ ] AC-3: Changes persist immediately.

**Dependencies:** 02.1
**Status:** drafted

### Story 02.4 — Archive an account
**As a** user
**I want** to archive accounts I don't use anymore
**So that** they don't clutter the UI.

**Acceptance criteria:**
- [ ] AC-1: "Archive" sets `archived_at` timestamp; account is hidden from active lists.
- [ ] AC-2: Archived accounts visible under "Archived" section, can be restored.
- [ ] AC-3: Archiving does NOT delete transactions; historical analytics still include them.
- [ ] AC-4: Transaction creation forms exclude archived accounts from dropdown.

**Dependencies:** 02.1, 02.2
**Status:** drafted

### Story 02.5 — First-account onboarding nudge
**As a** new user
**I want** a friendly prompt to add my first account
**So that** I understand the prerequisite for logging transactions.

**Acceptance criteria:**
- [ ] AC-1: If user has zero active accounts, dashboard shows a banner: "Add your first account to start tracking."
- [ ] AC-2: Clicking the banner opens the account creation form.
- [ ] AC-3: Banner disappears once ≥1 active account exists.

**Dependencies:** 02.1
**Status:** drafted

---

## Data model impact

New table:
```prisma
model Account {
  id                   String    @id @default(uuid())
  userId               String    @map("user_id")
  name                 String
  type                 AccountType
  institution          String?
  openingBalance       Int       @map("opening_balance")  // in paise
  openingBalanceDate   DateTime  @map("opening_balance_date")
  creditLimit          Int?      @map("credit_limit")
  statementDay         Int?      @map("statement_day")
  principal            Int?
  interestRate         Decimal?  @map("interest_rate")
  tenureMonths         Int?      @map("tenure_months")
  emiAmount            Int?      @map("emi_amount")
  archivedAt           DateTime? @map("archived_at")
  createdAt            DateTime  @default(now()) @map("created_at")

  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name])
  @@index([userId, archivedAt])
}

enum AccountType {
  SAVINGS
  CURRENT
  CREDIT_CARD
  CASH
  UPI_WALLET
  LOAN
}
```

Money stored as integer paise per convention (ADR-0008).

---

## API surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/accounts` | Create |
| GET | `/api/accounts` | List (filter: active/archived) |
| GET | `/api/accounts/[id]` | Fetch one |
| PATCH | `/api/accounts/[id]` | Update metadata |
| POST | `/api/accounts/[id]/archive` | Archive (soft delete) |
| POST | `/api/accounts/[id]/restore` | Unarchive |

All enforced by RLS + app-layer user-scoping.

---

## UX references

- Account list page → `front-end-spec.md § Accounts List`
- Create/edit account form → `front-end-spec.md § Account Form`
- Empty-state onboarding banner → `front-end-spec.md § Empty States`

---

## Risks

- **Users forget to set accurate opening balances**, then balances drift from reality. **Mitigation:** in-app tip + "reset opening balance" utility in v1.5.
- **Credit card statement_day** logic can be subtle (rolling cycles). For v1, use a simple calendar-day model; revisit in v1.5.
- **Archiving an account with open credit balance** — show a warning.

---

## Definition of done (epic-level)

- [ ] All 5 stories `done`.
- [ ] I can create accounts across all 6 types, edit, and archive them.
- [ ] Credit card account correctly captures limit and statement day.
- [ ] Loan account captures principal, rate, tenure.
- [ ] Dashboard empty-state banner works correctly.
- [ ] `CHANGELOG.md` has an Epic 02 entry.
