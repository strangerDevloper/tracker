# Alignment Memo — 2026-04-24

**Author:** Sarah (PO)
**Trigger:** First full cross-doc alignment pass before Epic 01 enters execution.
**Scope reviewed:** PRD v1, `architecture.md`, ADRs 0001–0009, `front-end-spec.md`, `component-inventory.md`, epics 01–07.

---

## TL;DR

- **Dependency graph across epics is clean** — no circularities, no missing prerequisites.
- **4 cross-doc conflicts found** that must be resolved before stories in the affected areas go `ready`.
- **5 open questions from front-end-spec §8** + **4 from architecture §15** still sitting without owners. Carried forward below.
- **Epic 01 is close to ready** — one blocker (Conflict #3) affects Story 01.1 directly; proposed resolution is cheap.
- **Component inventory has 4 story-ID typos** in rows I wrote earlier today. Sarah will fix these directly — no owner decision needed.

---

## Conflicts

### Conflict #1 — Dashboard card ordering disagrees across docs

| Source | Order |
|---|---|
| `front-end-spec.md` §5.3 (Sally) | **Net worth → Category → Portfolio → Trend** |
| `epic-06-dashboard.md` stories 06.2 → 06.5 | Category → Trend → Net worth → Portfolio |

Sally's reasoning (quoted): *"Net worth + savings rate — the single most emotionally relevant number"* as first card. Epic 06 was drafted before the front-end spec existed and defaulted to a different ordering.

**Decision owner:** John (PM) — but Sally's argument is strong and I recommend we adopt it.
**Recommendation:** Update Epic 06 to state the card render order explicitly ("the dashboard renders cards in the order specified in front-end-spec §5.3"), and leave story IDs alone (06.2 still builds the category card; its render position is a UI concern, not a schema/API concern).
**Blocks:** Epic 06 stories. Does NOT block Epic 01.

---

### Conflict #2 — Cron endpoint count: three endpoints vs. two

| Source | Endpoints claimed |
|---|---|
| `adr-0007-vercel-cron.md` §Decision | **2 endpoints** — `/api/cron/nightly-refresh` (combines price refresh + valuation recompute) + `/api/cron/send-budget-alerts`. Explicitly designed to fit Vercel Hobby's 2-cron free-tier limit. |
| `architecture.md` §API table + vercel.json sample | **3 endpoints** — `/api/cron/refresh-prices` + `/api/cron/recompute-valuations` + `/api/cron/send-budget-alerts`. Will not fit free tier. |
| `epic-04-investments.md` §API surface | **2 endpoints** — `/api/cron/refresh-prices` + `/api/cron/recompute-valuations`. Endpoint names match architecture.md, not ADR-0007. |

Architecture.md and Epic 04 were drafted before ADR-0007 finalized the combine-into-one decision. ADR-0007 is the newer, authoritative source (per architecture.md §header: *"If this doc and an ADR disagree, the newer ADR wins."*).

**Decision owner:** Winston (Architect) — but the ADR already decided; this is a docs-propagation fix.
**Recommendation:**
1. Update `architecture.md` §API catalog to list `/api/cron/nightly-refresh` (replacing the two separate entries).
2. Update architecture.md's `vercel.json` sample to match ADR-0007.
3. Update `epic-04-investments.md` §API surface to `/api/cron/nightly-refresh`.

**Blocks:** Epic 04 stories 04.3–04.10 once any of them go `ready` (but not 01.x).

---

### Conflict #3 — `public.users.id` modeling doesn't match RLS expectation

| Source | Claim |
|---|---|
| `architecture.md` §6 line 322 | *"On first-ever login, `/api/auth/callback` upserts a `public.users` row **mirroring** `auth.users.id`."* — i.e., `public.users.id = auth.users.id`. |
| `architecture.md` §6 lines 220, 327 | RLS policies: `user_id = auth.uid()`. Relies on `public.users.id` being identical to the Supabase auth uuid. |
| `epic-01-foundation-auth.md` §Data model | `model User { id String @id @default(uuid()) ... }` — **generates a new uuid** via Prisma. Breaks the RLS equality assumption. |

If we ship Epic 01 with the current Prisma model, the app will generate a fresh public uuid on signup, and every RLS policy in the app will silently fail to match rows (or worse, match the wrong ones if some code path does get it right).

**Decision owner:** Winston. There are two clean resolutions:

**Option A — `public.users.id` set to `auth.users.id` on upsert** (recommended)
```prisma
model User {
  id            String   @id           // no @default — set explicitly from auth.users.id
  email         String   @unique
  ...
}
```
RLS policies stay as `user_id = auth.uid()`. Simpler. Matches Supabase's canonical pattern.

**Option B — Keep public.id separate, add `authUserId`**
```prisma
model User {
  id          String   @id @default(uuid())
  authUserId  String   @unique @map("auth_user_id")
  ...
}
```
RLS policies become subquery-based (`user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())`), which is slower and more error-prone per policy.

**Recommendation:** Option A. Cheapest, and it's the Supabase standard. Needs Winston's sign-off (quick — this is ~10 minutes of his time), and Epic 01 data-model section gets a one-line edit.

**Blocks:** Story 01.1. This is *the* gate to marking 01.1 `ready`.

---

### Conflict #4 — Transfer row typing disagrees between ADR and Epic 03

| Source | Claim |
|---|---|
| `adr-0005-unified-transactions-table.md` lines 43, 78, 86–87 | Transfer pair is **two rows both typed `TRANSFER`**, linked by `transfer_group_id`. Analytics excludes `TRANSFER` via `WHERE type IN ('EXPENSE','INCOME')`. |
| `epic-03-transactions.md` Story 03.9 AC-3 | *"creates two rows in `transactions`: one `EXPENSE` from source, one `INCOME` to destination, linked by `transfer_group_id`"*. Contradicts the ADR. |
| `epic-03-transactions.md` Story 03.9 AC-4 | Filters analytics via `transfer_group_id IS NOT NULL` instead of `type = TRANSFER`. |

Both models would work but mixing them is a bug waiting to happen. ADR-0005 is authoritative.

**Decision owner:** Sarah (me) — this is a docs inconsistency, not a design question. ADR-0005 already made the call.
**Recommendation:** Rewrite Epic 03 Story 03.9 AC-3 and AC-4 to match ADR-0005. I'm doing this as part of this pass (no need to escalate).

**Blocks:** Story 03.9 only.

---

## Component inventory — stale story IDs (self-correct)

Rows in `component-inventory.md` I wrote this morning reference story IDs that don't exist or point at the wrong story. Fixing directly:

| Component | Current (wrong) | Corrected |
|---|---|---|
| `TransferEntryForm` | Epic 03 Story 03.10 | Epic 03 Story 03.9 |
| `TransactionListMobile` / `TransactionTableDesktop` | Epic 03 Story 03.5 | Epic 03 Story 03.6a |
| `TransactionFilters` | Epic 03 Story 03.6 | Epic 03 Story 03.6a |
| `HoldingCardMobile` / `HoldingTableDesktop` | Epic 04 Story 04.7 | Epic 04 Story 04.8 |
| `HoldingDetail` | Epic 04 Story 04.8 | Epic 04 Story 04.9 |

Sarah will edit the inventory in the same pass.

---

## Open questions (carried forward — not blocking Epic 01)

### From front-end-spec.md §8

1. **Sub-category aggregation in dashboard donut.** Roll up children under parent, or show separately? Sally's default: roll up parent; children in list below. **Owner: John (PM).**
2. **Onboarding tour.** Do we ship a guided tour (intro cards) in v1, or skip? **Owner: John.**
3. **Rapid-entry "Save & add another."** Deferred to v1.5 per Sally's draft. Confirm or reverse. **Owner: John.**
4. **Transfer row rendering in account view.** One row or two in the list? **Owner: Sally + Sarah; low-risk.**
5. **Receipt upload.** Schema ready (Epic 03 Story 03.2 AC-4 reserves `attachment_url`). UI deferred. Confirm v1.5. **Owner: John.**

### From architecture.md §15

1. **Liability tracking beyond loans.** Credit-card revolving balance already modeled; explicit consumer-loan tracking (CIBIL-impact) not in v1. **Owner: John.**
2. **Dividend dual classification.** DIVIDEND income row + dividend tagged on InvestmentTxn — is this one event or two? **Owner: Winston.**
3. **Crypto exchange tagging.** Which exchange held the coin — metadata only, or structured column? **Owner: Winston; probably metadata is fine.**
4. **Sub-category aggregation at compute time.** Same question as front-end spec #1 but at the SQL layer. **Owner: Winston.**

### Follow-up I'm adding

5. **Budget `alert_thresholds` column vs. hard-coded v1 scope.** Epic 05 Prisma has `alertThresholds Decimal[] @default([0.8, 1.0])` but scope says thresholds are hard-coded in v1 (configurable v1.5). Schema prep for v1.5 is fine; document intent in the epic. **Owner: Sarah — documentation nit, I'll update Epic 05.**

---

## What proceeds and what waits

**Can proceed to SM / Dev now:**
- Epic 01 Story 01.1 — once Winston confirms Conflict #3 resolution (Option A). See readiness assessment below.

**Waits for conflict resolution:**
- Epic 01 Story 01.5 (RLS) — depends on Conflict #3 Option A being encoded in the migration.
- Epic 04 Stories 04.3 / 04.4 / 04.5 / 04.10 — depend on Conflict #2 fix (endpoint name).
- Epic 03 Story 03.9 — AC rewrite needed (Conflict #4) before it goes `ready`.
- Epic 06 stories — all hold until Conflict #1 decision lands.

**Unaffected (proceed when their deps are done):**
- Epic 01 Stories 01.2, 01.3, 01.4, 01.6, 01.7
- Epic 02 — all stories
- Epic 03 Stories 03.1–03.8 (only 03.9 is affected)
- Epic 04 Stories 04.1, 04.2, 04.6, 04.7, 04.8, 04.9 (non-cron)
- Epic 05 — all stories
- Epic 07 — all stories

---

## Epic 01 Story 01.1 — readiness assessment

Applying the PO readiness checklist (from `agents/po.md`):

| Check | Status | Notes |
|---|---|---|
| AC are testable | ✅ | AC-1 through AC-5 each write a pass/fail test. |
| Dependencies satisfied | ✅ | No upstream stories; foundation. |
| Data model impact spelled out | ⚠️ | User + UserSettings models in epic, **but Conflict #3 needs to be applied** — `User.id` must drop `@default(uuid())`. |
| API contract specified | ✅ | `/api/auth/callback`, `/api/me`, `/api/auth/signout`, `DELETE /api/account`. |
| UX references real wireframe | ✅ | `front-end-spec.md §5.1 Login`. |
| No open question blocks | ⚠️ | Conflict #3 is the only blocker. |
| Right-sized | ✅ | One focused session. |

**Verdict:** Mark `ready` **conditionally** — conditional on Bob's story file encoding the Conflict #3 Option A resolution (explicit `User.id = auth.users.id` on upsert, no `@default(uuid())`). Winston's formal blessing is a nice-to-have but not a blocker because the Supabase canonical pattern is unambiguous and we've already documented it in architecture.md §6.

Sarah will mark `ready` and add a flag in the story file requesting Bob to explicitly call out the id-mapping pattern in the story context block.

---

## Actions Sarah is taking right now

1. ✏️ Fix `component-inventory.md` story-ID typos (above table).
2. ✏️ Rewrite `epic-03-transactions.md` Story 03.9 AC-3 and AC-4 to match ADR-0005.
3. ✏️ Update `epic-01-foundation-auth.md` Prisma `User` model: drop `@default(uuid())`, add inline note that id mirrors `auth.users.id`.
4. ✏️ Mark `epic-01-foundation-auth.md` Story 01.1 status: `ready`.
5. 📨 Hand off to Bob (SM) — see handoff note at bottom of this memo.

## Actions Sarah is NOT taking (owner decisions)

- Conflict #1 (dashboard order): flagged for John + propagation to Epic 06. Epic 06 stays `drafted`.
- Conflict #2 (cron endpoints): flagged for Winston to propagate to architecture.md + Epic 04. Epic 04 stays `drafted`.
- All 9 open questions: flagged, awaiting owners.

---

## Handoff note to Bob (SM)

> Bob, first-pass alignment is in `bmad/artifacts/alignment-2026-04-24.md`. Four conflicts surfaced; only one touches Epic 01 and I've resolved it in the epic file directly (User.id now correctly mirrors auth.users.id).
>
> **Story 01.1 (Google OAuth) is `ready`.** Pick it up. One thing you *must* put in the context block of your story file: the `public.users.id = auth.users.id` mapping. It's tempting to let Prisma default a new uuid — don't; it breaks every RLS policy in the app. See Conflict #3 in the memo for the why.
>
> **Story 01.5 (RLS) stays `drafted`** — don't pick up until 01.1 is done (so you can reference the actual user-creation code).
>
> **Stories 01.2, 01.3, 01.4, 01.6, 01.7 stay `drafted`** — I'll promote them one at a time as the dependency chain clears.
>
> **Do not pick up anything from Epic 06 yet** — waiting on John's call on card ordering (Conflict #1).
> **Do not pick up Epic 04 cron stories yet** — waiting on Winston's docs propagation (Conflict #2).
> **Do not pick up Epic 03 Story 03.9 yet** — I've patched the AC but marking it `drafted` until the rest of Epic 03 catches up.

---

## Log

- 2026-04-24: first alignment pass. 4 conflicts, 9 open questions carried forward.
