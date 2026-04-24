# Epic 07 — Data Import (Excel / CSV)

**Status:** drafted
**Owner:** Tushar
**Depends on:** Epic 02 (accounts), Epic 03 (transactions, categories), Epic 04 (investments)
**Unblocks:** nothing (cross-cutting utility)
**Estimated duration:** ~5 days

---

## Why this epic exists

The user has **years of historical data in Excel**. If they have to re-enter it, they won't — the app will launch with an empty dashboard and meaningful analytics will take 6 months to materialize.

A good importer does three things: (1) **reads messy real-world Excel** without choking, (2) **lets the user map columns visually** rather than asking them to reformat the sheet, (3) **supports a dry-run** so a bad import can be caught before writing to the DB.

This epic is the bridge between the user's past and the app's future.

---

## Scope — in

- Upload `.xlsx`, `.xls`, `.csv` files via a file picker.
- Sheet selector (for multi-sheet Excel files).
- Header-row selector (user indicates which row is the header).
- Auto-detected column mapping with user override.
- Support importing **transactions** (primary).
- Support importing **investment transactions** (secondary).
- Category mapping screen: match file's categories to app's categories, with inline "create new category" option.
- Account mapping screen: match file's account names to app's accounts.
- Dry-run preview: first 20 rows, with any errors/warnings highlighted.
- Confirm → bulk insert as a single atomic batch.
- Undo last import (within 24 hours).
- Import history log.

## Scope — out

- ❌ Import from PDFs (bank statements).
- ❌ Import from bank SMS.
- ❌ Import from photos / OCR.
- ❌ Real-time sync with Google Sheets.
- ❌ API-based upload (file only).
- ❌ Scheduled / recurring imports.

---

## User stories

### Story 07.1 — File upload & parsing
**As a** user
**I want** to upload an Excel or CSV file and have the app read it
**So that** I don't retype history.

**Acceptance criteria:**
- [ ] AC-1: Settings → Import → upload page accepts .xlsx, .xls, .csv (max 10 MB).
- [ ] AC-2: On upload, file stored in Supabase Storage under `imports/{user_id}/{timestamp}/`.
- [ ] AC-3: Server parses file; returns list of sheets (Excel) and first 100 rows per sheet.
- [ ] AC-4: Errors handled: corrupt file, unsupported format, file too large.
- [ ] AC-5: Parsing uses SheetJS on the server (or a pre-parsed preview from the client if small).

**Dependencies:** Epic 01.
**Status:** drafted

### Story 07.2 — Sheet & header-row selector
**As a** user
**I want** to tell the app which sheet and header row to use
**So that** multi-sheet or oddly-structured files work.

**Acceptance criteria:**
- [ ] AC-1: After upload, UI shows sheet tabs (for Excel) + a preview of first 20 rows per sheet.
- [ ] AC-2: User selects a sheet → user picks a header row (dropdown: row 1–10).
- [ ] AC-3: Selection persists to next step.

**Dependencies:** 07.1
**Status:** drafted

### Story 07.3 — Column mapping UI
**As a** user
**I want** to map the file's columns to transaction fields
**So that** I don't have to reformat the sheet.

**Acceptance criteria:**
- [ ] AC-1: UI displays file columns alongside app fields (date, amount, category, account, note, type).
- [ ] AC-2: Auto-guess based on column-name heuristics ("Date" → `txn_date`, "Amount" / "Debit" / "Credit" → `amount`, etc.).
- [ ] AC-3: User can override any mapping via dropdown.
- [ ] AC-4: Required fields: date, amount, account, category. User can't proceed without them mapped.
- [ ] AC-5: Signing convention detection: if file has separate Debit / Credit columns, UI helps map correctly.

**Dependencies:** 07.2
**Status:** drafted

### Story 07.4 — Category mapping
**As a** user
**I want** to match my Excel categories to the app's categories
**So that** I keep consistent taxonomy.

**Acceptance criteria:**
- [ ] AC-1: After column mapping, app reads distinct category values from the file.
- [ ] AC-2: UI lists each value with a dropdown: match to existing app category, or "Create new."
- [ ] AC-3: Exact / case-insensitive matches pre-selected.
- [ ] AC-4: "Create new" opens a small inline form (name, type, parent, color, icon).
- [ ] AC-5: Unmapped values block import.

**Dependencies:** 07.3, Epic 03 (categories).
**Status:** drafted

### Story 07.5 — Account mapping
**As a** user
**I want** to match my Excel accounts to app accounts
**So that** transactions land in the right accounts.

**Acceptance criteria:**
- [ ] AC-1: Same UI pattern as category mapping, for accounts.
- [ ] AC-2: "Create new account" inline option with minimum required fields.
- [ ] AC-3: Unmapped accounts block import.

**Dependencies:** 07.3, Epic 02 (accounts).
**Status:** drafted

### Story 07.6 — Dry-run preview
**As a** user
**I want** to see the first 20 rows of what will be imported, with any warnings
**So that** I can catch mistakes before committing.

**Acceptance criteria:**
- [ ] AC-1: Preview shows 20 sample rows with parsed values (date, amount, category name, account name).
- [ ] AC-2: Warnings surfaced: unparseable dates, zero amounts, amounts > 10 lakh (likely wrong), duplicate candidates.
- [ ] AC-3: Summary: "Will import 312 transactions across 8 categories and 3 accounts."
- [ ] AC-4: Confirm button disabled until user scrolls through preview.

**Dependencies:** 07.4, 07.5.
**Status:** drafted

### Story 07.7 — Commit import atomically
**As the** system
**I want** to write all imported rows in a single transaction
**So that** a partial failure doesn't leave me with half-imported data.

**Acceptance criteria:**
- [ ] AC-1: Import runs inside a Prisma `$transaction`.
- [ ] AC-2: All rows written with `source = IMPORT` and a shared `import_batch_id` in metadata.
- [ ] AC-3: On error, rollback + user-friendly error message + raw error in logs.
- [ ] AC-4: On success, row in `import_history` recorded with timestamp, batch_id, count, file name.
- [ ] AC-5: Toast notification + redirect to transactions list filtered by the new batch.

**Dependencies:** 07.6
**Status:** drafted

### Story 07.8 — Undo last import
**As a** user
**I want** to undo an import if I realize it was wrong
**So that** a bad file doesn't permanently pollute my data.

**Acceptance criteria:**
- [ ] AC-1: Import history page lists past imports with "Undo" action (only enabled within 24 hours).
- [ ] AC-2: Undo deletes all rows with that `import_batch_id`.
- [ ] AC-3: Confirmation dialog requires typing the word "undo."
- [ ] AC-4: Categories and accounts created during import are NOT auto-deleted (explicit, to avoid surprises).

**Dependencies:** 07.7
**Status:** drafted

### Story 07.9 — Investment import variant
**As a** user
**I want** to import investment transactions (MF/stock buy/sell history)
**So that** my portfolio includes pre-launch holdings.

**Acceptance criteria:**
- [ ] AC-1: Import flow has a toggle / separate entry for "Investment transactions."
- [ ] AC-2: Column mapping expects: holding (name or identifier), txn_type (BUY/SELL/SIP/DIVIDEND), units, price_per_unit, amount, date.
- [ ] AC-3: Holding mapping step: match file's holding names to existing holdings or create new.
- [ ] AC-4: Same dry-run + commit + undo flow as 07.6–07.8.

**Dependencies:** 07.7, Epic 04.
**Status:** drafted

---

## Data model impact

Additions:
```prisma
model ImportBatch {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  fileName    String   @map("file_name")
  rowCount    Int      @map("row_count")
  kind        ImportKind  // TRANSACTIONS | INVESTMENT_TXNS
  createdAt   DateTime @default(now()) @map("created_at")
  undoneAt    DateTime? @map("undone_at")

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum ImportKind { TRANSACTIONS INVESTMENT_TXNS }
```

Minor: `transactions.metadata` carries `{ import_batch_id }` for undo lookup. Same for `investment_txns.notes` or add a dedicated `metadata` column to that model.

---

## API surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/imports/upload` | Receive file, parse, return sheets preview |
| POST | `/api/imports/validate` | Given mapping, run dry-run & return preview |
| POST | `/api/imports/commit` | Atomic commit of the mapped rows |
| POST | `/api/imports/[batchId]/undo` | Undo an import |
| GET | `/api/imports/history` | List past imports |

---

## UX references

- Multi-step import wizard (upload → sheet → columns → categories → accounts → preview → commit) → `front-end-spec.md § Import Wizard`
- Category mapping screen (most complex) → `front-end-spec.md § Category Mapping`
- Dry-run preview table → `front-end-spec.md § Import Preview`
- Import history → `front-end-spec.md § Import History`

---

## Risks

- **Date format variability.** DD/MM/YYYY vs. MM/DD/YYYY vs. "5-Apr-26" vs. Excel serial numbers. **Mitigation:** let user specify date format if auto-detection is ambiguous; show detected format in preview.
- **Amount signing conventions.** Expenses-as-negative vs. expenses-as-positive vs. separate debit/credit columns. **Mitigation:** explicit toggle during mapping; preview shows signed amounts clearly.
- **Duplicate imports.** User imports the same file twice. **Mitigation:** duplicate-candidate detection in dry-run warnings based on date + amount + description.
- **Big files.** 5-year sheets can have 10k+ rows. **Mitigation:** chunked inserts inside the transaction; progress indicator.
- **Merged cells / formulas / hidden rows.** Real Excel files are ugly. **Mitigation:** SheetJS handles most; for truly broken files, error out with a helpful message.

---

## Definition of done (epic-level)

- [ ] All 9 stories `done`.
- [ ] I can upload my actual Excel file and successfully import 1+ year of history.
- [ ] Categories and accounts not in the app can be created inline during import.
- [ ] Dry-run preview catches at least: unparseable dates, zero amounts, wild amounts.
- [ ] Undo works within 24 hours and cleanly removes imported rows.
- [ ] Investment import handled for at least one asset class end-to-end.
- [ ] `CHANGELOG.md` has Epic 07 entry.
