# Component Inventory

**Owner:** Sally (UX Expert)
**Last updated:** 2026-04-24
**Audience:** James (Dev) during implementation; Winston (Architect) for swap-boundary review; Sarah (PO) for scope sanity-checks.

---

## Purpose

A single place that answers: *"Before I build a new component, does one already exist?"* If the answer is yes, reuse it. If no, add it here at the same time you add the file to the repo, so the next story doesn't reinvent it.

This inventory mirrors the folder structure in **ADR-0008**:

```
components/
├── ui/          # shadcn-owned primitives
├── charts/      # Recharts adapter layer
├── forms/       # Shared form inputs
└── finance/     # Domain components
```

Rules (from ADR-0008, repeated here so James sees them at edit time):
- `ui/` is shadcn-owned. No domain logic, no finance-specific defaults.
- `charts/` is the **only** place that imports from `recharts`. Swap-ready.
- `forms/` composes `ui/` into reusable finance inputs (currency, date, category, account).
- `finance/` composes everything above into multi-input domain widgets.

---

## 1. `components/ui/` — shadcn primitives

Install via `npx shadcn@latest add {name}`. Do not hand-edit the generated file beyond the shadcn-approved customization points.

| Component | Purpose | Used by screens |
|---|---|---|
| `button` | All clickable actions | Every screen |
| `input` | Text + number input | Forms, search |
| `label` | Form field label | Forms |
| `textarea` | Multi-line notes | Detailed entry, investment notes |
| `select` | Native select for short lists | Settings, filters |
| `checkbox` | Binary toggles | Settings, import |
| `radio-group` | One-of-few selections | Auth method picker, txn type |
| `switch` | Feature toggles | Settings, budget alert on/off |
| `dialog` | Blocking modal | Confirmations, onboarding |
| `sheet` | Bottom/side drawer | Mobile category picker, filters |
| `popover` | Non-blocking float | Date picker, account picker |
| `dropdown-menu` | Action overflow | Row actions (edit/delete) |
| `tabs` | Section switcher | Detailed entry (Expense / Income / Transfer) |
| `card` | Surface container | Dashboard cards, holding cards |
| `badge` | Status / category chip | Budget status, txn category |
| `separator` | Visual divider | Lists, card headers |
| `skeleton` | Loading placeholder | All async surfaces |
| `toast` (sonner) | Transient feedback | Save / undo / error toasts |
| `alert` | Inline notice banner | Budget breach banner, staleness notice |
| `alert-dialog` | Destructive confirmation | Delete txn, delete account, undo import |
| `table` | Semantic table | Desktop investments, transactions list |
| `avatar` | User identity | Top-nav (desktop) |
| `progress` | Percent bar | Budget progress |
| `tooltip` | Keyboard/hover help | Icon-only buttons, truncation |
| `command` | Keyboard palette | Search (desktop ⌘K), category search |
| `calendar` | Month-grid date picker | Date selection popover |
| `scroll-area` | Styled scroll container | Category sheet, long lists |

**Not yet adopted, may need later:**
- `form` (react-hook-form wiring helper) — pick up when building Epic 03 detailed entry.
- `accordion` — only if Settings or Import review grows enough to need collapsing sections.
- `breadcrumb` — not needed; IA is shallow (max 2 levels).
- `navigation-menu` — desktop sidebar is simpler than this; use plain links.

---

## 2. `components/charts/` — Recharts adapter layer

Everything Recharts-facing lives here. If we ever swap to Visx or a Canvas library, these 6 files are the only ones that change.

| Component | Used by | Notes |
|---|---|---|
| `NetWorthTrendChart` | Dashboard card 4 | Area chart, 30/90/365 day ranges. Empty-state illustration when <2 data points. |
| `CategoryDonut` | Dashboard card 2, Budgets page | Donut with slice legend. Top 5 + "Other". Tap a slice → filtered txn list. |
| `PortfolioSplitBar` | Dashboard card 3 | Horizontal stacked bar by asset class. |
| `SparklineMini` | Holding card (mobile), row (desktop) | Last-30-day price sparkline. No axes, no tooltip. |
| `BudgetProgressBar` | Budgets card, dashboard peek | Not actually a chart — uses `ui/progress` + color state. Included here because it expresses a ratio. |
| `XirrBadge` | Holding detail | Not a chart — renders the XIRR number with color + ↑/↓ arrow + period label. |

**Policy:**
- No domain logic in these files. They take already-shaped data props, no async fetching.
- Accept a `loading?: boolean` prop; render a `ui/skeleton` at the same size while true.
- Responsive via `ResponsiveContainer`; never fix pixel width.

---

## 3. `components/forms/` — Shared form inputs

Built on shadcn primitives + react-hook-form. These encode finance-specific rules (paise math, date defaults, INR locale) so no two forms disagree on them.

| Component | Purpose | Behavior |
|---|---|---|
| `CurrencyInput` | Rupee amounts | Masked input. Accepts `200`, `200.50`, `2,000`, `2k`. Emits paise (int) to form state. Shows `₹` prefix. Right-aligned. |
| `DatePicker` | Txn / investment dates | Popover wrapping `ui/calendar`. Defaults to today. Accepts past dates up to 5 years; future dates disabled by default (opt-in for scheduled txns in v1.5). |
| `CategorySelect` | Pick txn category | Bottom sheet on mobile, popover on desktop. Grid with icons + labels. Search box. "Recent" section at top. |
| `AccountSelect` | Pick source/dest account | Same pattern as `CategorySelect`. Groups accounts by type. Shows balance inline. |
| `TxnTypeTabs` | EXPENSE / INCOME / TRANSFER | Three-tab control that restructures the rest of the form. Wrapper around `ui/tabs`. |
| `InvestmentTypePicker` | MF / Stock / FD / PPF / etc. | Select with icon per asset class. Drives which sub-fields render. |
| `NotesField` | Optional free-text | `ui/textarea` capped at 500 chars. Counter visible only when >400. |
| `FormSection` | Visual grouping | `<section>` + optional heading + `ui/separator`. No logic. |
| `FormActions` | Save / Cancel bar | Sticky-bottom on mobile, inline on desktop. Handles disabled/loading state from form state. |
| `FieldError` | Validation message | Renders Zod issue string; red text + `aria-live="polite"`. |

**Policy:**
- Every form input here must:
  1. Accept `name`, `label`, and optional `hint` props.
  2. Wire up to react-hook-form via `Controller` internally.
  3. Render a visible `<label>` (no placeholder-only fields — design principle #4).
  4. Handle `disabled` and `loading` states.
- Currency values emit **paise as integers** to form state. The Zod schema validates bounds.
- Never import from `lib/db/*` — these are UI only.

---

## 4. `components/finance/` — Domain components

Multi-input, meaningful-in-context components. Each one maps to a concrete user story.

### Entry & quick actions

| Component | Screen | Story |
|---|---|---|
| `QuickExpenseEntry` | Quick entry modal | Epic 03 Story 03.1 |
| `DetailedEntryForm` | Detailed entry screen | Epic 03 Story 03.2 |
| `IncomeEntryForm` | Detailed entry → Income tab | Epic 03 Story 03.3 |
| `TransferEntryForm` | Detailed entry → Transfer tab | Epic 03 Story 03.9 |
| `InvestmentTxnForm` | Investment txn modal | Epic 04 Story 04.2 |
| `HoldingForm` | Create/edit holding | Epic 04 Story 04.1 |
| `AccountForm` | Create/edit account | Epic 02 |
| `BudgetForm` | Create/edit budget | Epic 05 Story 05.1 |
| `Fab` | Floating action button | App shell (mobile) |

### Dashboards & summaries

| Component | Screen | Story |
|---|---|---|
| `NetWorthCard` | Dashboard card 1 | Epic 06 Story 06.2 |
| `CategorySpendCard` | Dashboard card 2 | Epic 06 Story 06.3 |
| `PortfolioSplitCard` | Dashboard card 3 | Epic 06 Story 06.4 |
| `TrendCard` | Dashboard card 4 | Epic 06 Story 06.5 |
| `BudgetPeekStrip` | Dashboard above-the-fold alert | Epic 05 Story 05.5 |
| `StalenessNotice` | Top of investments / dashboard when prices are stale | Epic 04 |

### Lists & tables

| Component | Screen | Story | Notes |
|---|---|---|---|
| `TransactionListMobile` | Txn list (mobile) | Epic 03 Story 03.6a | Grouped by date; swipe-to-edit. |
| `TransactionTableDesktop` | Txn list (desktop) | Epic 03 Story 03.6a | shadcn `ui/table`; sortable columns; row menu. |
| `TransactionFilters` | Txn list filters | Epic 03 Story 03.6a | Date range + category multiselect + account multiselect + amount range. |
| `HoldingCardMobile` | Investments (mobile) | Epic 04 Story 04.8 | Dual rendering call from front-end spec. |
| `HoldingTableDesktop` | Investments (desktop) | Epic 04 Story 04.8 | `ui/table`; sticky header; sortable. |
| `AccountGroupList` | Accounts page | Epic 02 Story 02.1 | Grouped by account type. |
| `CategoryList` | Categories page | Epic 03 Story 03.4 | Draggable reorder in v1.5. |
| `BudgetList` | Budgets page | Epic 05 Story 05.3 | Progress bars with color state. |

### Detail views

| Component | Screen | Story |
|---|---|---|
| `HoldingDetail` | Investment holding detail | Epic 04 Story 04.9 |
| `TransactionDetail` | Txn detail sheet (mobile) / dialog (desktop) | Epic 03 Story 03.7 |
| `AccountDetail` | Account transactions view | Epic 02 Story 02.5 |

### Import wizard (Epic 07)

| Component | Wizard step | Story |
|---|---|---|
| `ImportUpload` | Step 1 | Epic 07 Story 07.1 |
| `SheetHeaderSelector` | Step 2 | Epic 07 Story 07.2 |
| `ColumnMapper` | Step 3 | Epic 07 Story 07.3 |
| `CategoryMapper` | Step 4 | Epic 07 Story 07.4 |
| `AccountMapper` | Step 4b | Epic 07 Story 07.5 |
| `DryRunPreview` | Step 5 | Epic 07 Story 07.6 |
| `ImportCommitResult` | Step 6 + undo banner | Epic 07 Story 07.7 + 07.8 |
| `ImportStepper` | Wizard chrome | Epic 07 Story 07.1 |

### App shell

| Component | Purpose |
|---|---|
| `AppShell` | Top-level layout; chooses mobile vs. desktop rendering |
| `TopNav` | Desktop header: logo, search, user menu |
| `Sidebar` | Desktop left nav |
| `BottomTabs` | Mobile bottom nav |
| `UserMenu` | Avatar → dropdown (Settings, Sign out) |
| `CommandPalette` | Desktop ⌘K search |
| `AuthCard` | Login surface (wraps 3 auth methods) |

### State helpers

| Component | Purpose |
|---|---|
| `EmptyState` | Title + illustration + CTA. Used by every list. |
| `ErrorBoundary` | Catches render errors; shows retry. Wrap every top-level route. |
| `InlineError` | Non-fatal error banner with retry button. |
| `LoadingPage` | Full-screen skeleton for initial route load. |
| `ConfirmDeleteDialog` | Generic destructive confirmation; takes `entityLabel` + `onConfirm`. |
| `UndoToast` | Toast with primary Undo action; handles 10s timer. |

---

## 5. Shared hooks (lives in `lib/hooks/`)

Not components, but referenced often enough to list here so they aren't reinvented.

| Hook | Purpose |
|---|---|
| `useDebounce(value, ms)` | Search input throttling |
| `useMediaQuery(query)` | Branching mobile vs. desktop rendering |
| `useOnlineStatus()` | Offline banner in v1.5 |
| `useOptimisticMutation(fn)` | Wrapper around Server Actions for optimistic updates + toast handling |
| `useConfirm(opts)` | Imperative API for `ConfirmDeleteDialog` |
| `useKeyboardShortcut(key, fn)` | Desktop ⌘K, delete-row shortcuts |

---

## 6. Currency & date formatting (lives in `lib/format/`)

Pure functions, not components — listed here so UI code doesn't fork them.

| Function | Contract |
|---|---|
| `formatINR(paise: number, opts?)` | `200050` → `"₹2,000.50"`. `opts.compact` → `"₹2K"`. Always en-IN locale. |
| `formatPercent(ratio: number, dp?)` | `0.1234` → `"12.3%"`. |
| `formatDate(date, preset)` | Presets: `short` (24 Apr), `long` (24 Apr 2026), `relative` (2 days ago, today, yesterday). |
| `parseCurrencyInput(text)` | Accepts `"2,000.50"`, `"2k"`, `"2.5L"` → returns paise int or null. |

---

## 7. Icon set

One icon library only: **lucide-react**. No emoji in durable UI (emoji OK in empty-state illustrations or toasts, not in table rows).

Common aliases to keep names consistent:

| Usage | Icon |
|---|---|
| Expense | `ArrowDownCircle` |
| Income | `ArrowUpCircle` |
| Transfer | `ArrowLeftRight` |
| Investment | `TrendingUp` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Add | `Plus` |
| Filter | `SlidersHorizontal` |
| Search | `Search` |
| Sort | `ArrowUpDown` |
| Success | `CheckCircle2` |
| Warning | `AlertTriangle` |
| Error | `XCircle` |
| Info | `Info` |
| Stale data | `CloudOff` |
| Back | `ChevronLeft` |
| Forward | `ChevronRight` |
| Close | `X` |
| More | `MoreVertical` |
| Calendar | `Calendar` |
| Category | `Tag` |
| Account | `Wallet` |
| User | `User` |
| Settings | `Settings` |
| Sign out | `LogOut` |

Category-specific icons (Food, Transport, etc.) live in `lib/categories/icons.ts` — also lucide, chosen per default category. Users pick from the lucide set when creating a custom category.

---

## 8. Color states for dynamic UI

Referenced by `BudgetProgressBar`, `XirrBadge`, staleness notices. Use CSS variables, not hex, so dark mode (v1.5) works without refactor.

| Semantic state | Token | Use |
|---|---|---|
| Positive / healthy | `--success` | Budget <80%, XIRR ≥ 0, price fresh |
| Caution | `--warning` | Budget 80–100%, staleness 24–72h |
| Negative / breach | `--destructive` | Budget >100%, XIRR < 0, staleness >72h |
| Muted / resting | `--muted-foreground` | Secondary text, disabled states |

Do not hardcode `text-red-500` etc. in domain components; use the semantic tokens.

---

## 9. Rules James should enforce at PR review

1. **New component?** Add a row to this file in the same PR. No exceptions.
2. **Shadcn primitive needed?** `npx shadcn add` it; don't hand-roll.
3. **Recharts import outside `components/charts/`?** Blocked.
4. **Raw `₹` or hardcoded date format in JSX?** Use `formatINR` / `formatDate`.
5. **New icon not in section 7?** Add to the alias table.
6. **Color hardcoded (bg-red-500, text-green-600)?** Use semantic token.
7. **Form field without visible label?** Rejected (design principle #4).

---

## 10. Open questions (carried over from front-end-spec §8)

These affect the component surface but aren't Sally's to answer alone:

1. **Rapid-entry "Save & add another"** — if approved for v1, `QuickExpenseEntry` needs a second CTA. Currently designed single-save.
2. **Receipt upload** — if in v1, `DetailedEntryForm` needs an `AttachmentPicker` component. Not listed above because spec defers to v1.5.
3. **Onboarding tour** — would introduce a `TourTooltip` component + orchestration hook. Not listed; needs PM decision.
4. **Sub-category aggregation** — if categories go two levels deep, `CategorySelect` and `CategoryDonut` both need rework.
5. **Transfer in account view** — affects how `TransactionListMobile` / `TransactionTableDesktop` render transfer rows (one row or two).

---

## References

- [Front-end spec](./front-end-spec.md)
- [ADR-0008 — Folder structure](./adr/adr-0008-folder-structure-conventions.md)
- [Architecture doc](./architecture.md)
- [shadcn/ui docs](https://ui.shadcn.com/docs)
- [lucide-react icon search](https://lucide.dev/icons/)
