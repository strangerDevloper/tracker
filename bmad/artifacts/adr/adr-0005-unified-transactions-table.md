# ADR-0005: Unified `transactions` table for EXPENSE, INCOME, and TRANSFER

**Status:** Accepted
**Date:** 2026-04-24
**Deciders:** Winston (Architect)

---

## Context

Epic 03 introduces expense entry, income entry, and transfers between own accounts. The schema shape affects every aggregation (dashboard, budgets, trend) for the life of the app. Getting it wrong means a migration later with real data loss risk.

The core question: are expenses, income, and transfers **one table with a `type` column** or **three separate tables**?

---

## Options considered

### 1. Unified `transactions` table with a `type` enum
- ✅ One place to read "all activity" for a user in a date range.
- ✅ Aggregations (spend per category, savings rate) are one query with a `WHERE type = ...`.
- ✅ Indices are shared and well-loved by the planner.
- ✅ Transfer pair modeled as two rows linked by `transfer_group_id`.
- ⚠️ A single table is a bit heterogeneous — some columns apply only to certain types (e.g., `income_type` only on INCOME rows).
- ⚠️ Must remember to exclude transfers from expense/income analytics (central helper).

### 2. Separate tables: `expenses`, `incomes`, `transfers`
- ✅ Each table is homogeneous; types are tighter.
- ❌ "All activity this month" becomes a UNION of three tables — slower, uglier.
- ❌ Three sets of indices to maintain.
- ❌ Category + account foreign keys duplicated.
- ❌ Transfer "pair" modeling becomes awkward across tables.

### 3. Event-sourced transactions with a separate projections layer
- ✅ Audit-perfect history.
- ❌ Enormous overkill for a personal app with one user.
- ❌ Adds materialized view maintenance.

---

## Decision

**We will use a single `transactions` table with a `type` enum (`EXPENSE | INCOME | TRANSFER`) and a `transfer_group_id` to link transfer pairs.**

---

## Schema

```prisma
model Transaction {
  id               String      @id @default(uuid())
  userId           String      @map("user_id")
  accountId        String      @map("account_id")
  categoryId       String      @map("category_id")
  type             TxnType
  amount           Int         // paise, always positive; sign implied by type
  txnDate          DateTime    @map("txn_date")
  description      String?
  merchant         String?
  tags             String[]    @default([])
  incomeType       IncomeType? @map("income_type")   // only set when type = INCOME
  transferGroupId  String?     @map("transfer_group_id")  // only set when type = TRANSFER
  attachmentUrl    String?     @map("attachment_url")
  source           TxnSource   @default(MANUAL)
  metadata         Json        @default("{}")
  createdAt        DateTime    @default(now()) @map("created_at")

  user             User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  account          Account     @relation(fields: [accountId], references: [id])
  category         Category    @relation(fields: [categoryId], references: [id])

  @@index([userId, txnDate(sort: Desc)])
  @@index([userId, categoryId, txnDate])
  @@index([userId, accountId, txnDate])
  @@index([transferGroupId])
}

enum TxnType { EXPENSE INCOME TRANSFER }
enum IncomeType { SALARY BUSINESS DIVIDEND INTEREST RENTAL CAPITAL_GAIN GIFT REFUND OTHER }
enum TxnSource { MANUAL IMPORT WHATSAPP RECURRING }
```

### Transfer pairs
A transfer from HDFC → ICICI for ₹10,000 writes **two rows**:
```
row A: type=TRANSFER, account=HDFC,  amount=10000, transfer_group_id=xyz
row B: type=TRANSFER, account=ICICI, amount=10000, transfer_group_id=xyz
```
The sign (outflow / inflow) is implicit from "which account" — HDFC row reduces HDFC's balance; ICICI row increases ICICI's. This is cleaner than signed amounts because **amount is always ≥0 everywhere in the system**, matching money-arithmetic invariants.

### Transfers and analytics
Central helper in `lib/finance/transactions.ts`:
```ts
export function transactionsForAnalytics(q: TxnFilter) {
  return prisma.transaction.findMany({
    where: { ...q, type: { in: ['EXPENSE', 'INCOME'] } }, // excludes TRANSFER
    // ...
  });
}
```
All dashboard aggregations and budget computations route through this helper. No raw `prisma.transaction.findMany` in analytics code — enforced by code review.

---

## Rationale

1. **Aggregations are the hot path.** Dashboard Cards 1–3 all aggregate across types. A single table serves this cheaply.
2. **Transfer pairs are naturally modeled.** Two rows linked by `transfer_group_id` gives us accurate per-account balances without double-counting in income/expense.
3. **Category + account FKs live in one place.** Changing a category's name or archiving an account doesn't require touching three tables.
4. **Sign convention is safer.** `amount ≥ 0` always. Humans (and LLMs) have broken math because of sign-convention confusion. The type column carries semantics instead.
5. **WhatsApp (v2) intent maps cleanly.** A parsed message produces one `transactions` row (or two for transfer). No branching at the API boundary.

### Trade-offs knowingly accepted
- `income_type` is nullable (only set for INCOME rows). Null-on-non-applicable-type is a minor schema blemish; a DB check constraint prevents misuse: `(type = 'INCOME' AND income_type IS NOT NULL) OR (type != 'INCOME' AND income_type IS NULL)`.
- Forgetting to filter out `TRANSFER` in a custom query is a bug class. Mitigation: central helper + unit tests that assert transfers are excluded.

---

## Consequences

- ✅ Analytics queries are simple and fast.
- ✅ Indices are well-used by all major read paths.
- ✅ Transfer pairs are correct without double-counting.
- ⚠️ The `transactionsForAnalytics()` helper is load-bearing. Any new analytics surface must use it. Code review rule.
- ⚠️ Check constraints must be in the Prisma migration (raw SQL), not just app-level.
- 🔁 Reversibility: high within this shape; splitting the table later is possible but not cheap. No reason to expect that will be needed.

---

## References

- Epic 03 (Transactions)
- architecture.md §4
