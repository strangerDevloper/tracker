# BMAD Framework — Personal Finance Tracker

> **BMAD** = Breakthrough Method of Agile AI-Driven Development.
> Each phase of the SDLC is handled by a **specialized AI agent** with a dedicated persona, responsibilities, and input/output contracts. Agents hand off structured artifacts to each other, so work is always **context-engineered** — the dev agent never has to re-read the PRD because the story file contains everything it needs.

---

## Why BMAD for this project

I'm a solo builder extending this app across months. Without discipline:
- Scope creeps (I add features mid-sprint because I "remembered" them).
- Decisions get lost (why did I pick Prisma over Drizzle? I won't remember in 3 months).
- Refactors cascade (a feature added without architectural review breaks 3 others).
- AI coding sessions drift (Claude without context writes plausible-looking code that violates my own patterns).

BMAD fixes this by **freezing decisions in artifacts** and **scoping each AI session to one agent's concern**. When I switch to "Dev agent" mode, that session doesn't debate architecture — architecture is already decided upstream.

---

## Directory layout

```
bmad/
├── README.md              ← you are here
├── WORKFLOW.md            ← how agents hand off (end-to-end flow)
├── agents/                ← agent personas (invoke one at a time)
│   ├── analyst.md         ← Mary   — research, discovery, briefs
│   ├── pm.md              ← John   — PRDs, feature prioritization
│   ├── architect.md       ← Winston — system design, ADRs
│   ├── ux-expert.md       ← Sally  — wireframes, UI specs
│   ├── po.md              ← Sarah  — backlog, story refinement
│   ├── sm.md              ← Bob    — sprint stories with full context
│   ├── dev.md             ← James  — implementation
│   └── qa.md              ← Quinn  — test architecture, quality gates
└── epics/                 ← sharded feature PRDs (one per epic)
    ├── epic-01-foundation-auth.md
    ├── epic-02-accounts.md
    ├── epic-03-transactions.md
    ├── epic-04-investments.md
    ├── epic-05-budgets.md
    ├── epic-06-dashboard.md
    └── epic-07-data-import.md
```

Reference doc (upstream of everything here):
`../PRD_v1_Personal_Finance_Tracker.md`

---

## The 8 agents at a glance

| Agent | Persona | Owns | Produces |
|---|---|---|---|
| **Analyst** | Mary | Discovery, research, problem framing | Project brief, competitive scans, market notes |
| **PM** | John | What to build and why | PRD, epics, feature prioritization |
| **Architect** | Winston | How it's built | Architecture doc, ADRs, data model, tech choices |
| **UX Expert** | Sally | How it feels | Wireframes, component inventory, interaction specs |
| **PO** | Sarah | Backlog hygiene | Sharded epic files, acceptance criteria refinement, story readiness |
| **SM** | Bob | Making stories dev-ready | Story files with embedded context (tech, AC, tasks) |
| **Dev** | James | Making code real | Working feature on a branch + tests + changelog entry |
| **QA** | Quinn | Making sure it won't break | Test plan, quality gate verdict, risk register |

---

## Epics (sharded from the main PRD)

Each epic below is a standalone feature PRD. They are **meant to be worked one at a time**, in roughly this order:

| # | Epic | Status | Why this order |
|---|---|---|---|
| 01 | Foundation & Auth | 📋 Drafted | Every other epic depends on `user_id`. Ship auth first. |
| 02 | Accounts (bank/card/wallet) | 📋 Drafted | Transactions reference accounts — can't log expenses without them. |
| 03 | Transactions (expenses + income + categories) | 📋 Drafted | The primary daily interaction. |
| 04 | Investments (ledger + live valuation) | 📋 Drafted | Biggest epic. Can parallelize after Epic 02. |
| 05 | Budgets & Alerts | 📋 Drafted | Depends on 03 (needs categories + txns to compare against). |
| 06 | Dashboard & Analytics | 📋 Drafted | Read-only views on top of 03 + 04 + 05. Ship last. |
| 07 | Data Import (Excel/CSV) | 📋 Drafted | Cross-cutting; build once Epic 02 + 03 schemas are frozen. |

Status legend: 📋 drafted · 🚧 in progress · ✅ done · ⏸ paused · ❌ cancelled

---

## How to use this framework (quick start)

You don't need to talk to all 8 agents every time. Typical sessions:

### Starting a new epic
1. **PO (Sarah)** — "Shard Epic 04 into stories and rank them."
2. **SM (Bob)** — "Create story file for Story 04.1."
3. **Dev (James)** — "Implement Story 04.1."
4. **QA (Quinn)** — "Review Story 04.1 against its AC and risk register."

### Making an architecture decision
1. **Architect (Winston)** — "Should I use Drizzle or Prisma? Create an ADR."
2. **PO (Sarah)** — "Sarah, update affected epic files with the new decision."

### Adding a new feature mid-project
1. **Analyst (Mary)** — "Is this worth building? Write a brief."
2. **PM (John)** — "Fold this into the PRD as Epic 08 or into an existing epic."
3. **Architect (Winston)** — "Any architectural implications?"
4. Then back into the standard PO → SM → Dev → QA loop.

---

## Operating principles

1. **One agent per session, one artifact per agent.** Don't let an AI session drift across roles — it produces generic output.
2. **Every artifact is a file, not a chat message.** If the decision isn't written down, it didn't happen.
3. **Stories are context-engineered.** By the time Dev (James) reads a story, it contains: the business why, the UI spec, the data model impact, the AC, and the test plan. Dev doesn't re-derive anything.
4. **ADRs are append-only.** Architectural decisions are numbered (`adr-0001-prisma-over-drizzle.md`) and immutable. Changed your mind? Write a *new* ADR that supersedes the old one.
5. **PO is the gatekeeper of "ready."** SM can only create a story if PO has marked the epic's next slice as ready. Prevents half-baked stories.

See `WORKFLOW.md` for the full handoff flow and `agents/*.md` for how to invoke each persona.
