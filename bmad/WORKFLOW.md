# BMAD Workflow — End-to-End Flow for Personal Finance Tracker

This document shows how the 8 agents hand off work to each other across the full SDLC. The flow has two distinct phases — **Planning** (done mostly once per project / per major epic) and **Execution** (done per story, repeatedly).

---

## Phase 1 — Planning (done once, revisited per major epic)

```
┌─────────────┐    brief      ┌─────────────┐    PRD      ┌─────────────┐
│   Analyst   │──────────────▶│     PM      │────────────▶│  Architect  │
│   (Mary)    │               │   (John)    │             │  (Winston)  │
└─────────────┘               └─────────────┘             └──────┬──────┘
                                                                 │
                                                                 │ architecture.md
                                                                 │ + ADRs
                                                                 ▼
┌─────────────┐    UI spec    ┌─────────────┐
│  UX Expert  │◀──────────────│  Architect  │
│   (Sally)   │               │  (Winston)  │
└──────┬──────┘               └─────────────┘
       │
       │ front-end-spec.md
       ▼
┌─────────────┐
│     PO      │   validates alignment, shards PRD into epics
│   (Sarah)   │
└──────┬──────┘
       │ epics/*.md (one file per epic)
       ▼
   [Planning complete — move to Execution loop]
```

### Artifacts produced in Phase 1
| Artifact | Produced by | Location |
|---|---|---|
| Project brief | Analyst | `artifacts/brief.md` *(optional)* |
| Main PRD | PM | `../PRD_v1_Personal_Finance_Tracker.md` ✅ done |
| Architecture doc | Architect | `artifacts/architecture.md` |
| ADRs | Architect | `artifacts/adr/adr-NNNN-*.md` |
| Front-end spec | UX Expert | `artifacts/front-end-spec.md` |
| Epic files (sharded PRD) | PO | `epics/epic-NN-*.md` ✅ drafted |

---

## Phase 2 — Execution loop (repeat per story until epic done)

```
       ┌────────────────────────────────────────────────────────┐
       │                                                        │
       ▼                                                        │
┌─────────────┐   marks next      ┌─────────────┐  story file   │
│     PO      │   epic slice as   │     SM      │◀──────────────┤
│   (Sarah)   │   "ready" ──────▶ │    (Bob)    │               │
└─────────────┘                   └──────┬──────┘               │
                                         │                      │
                                         │ stories/NN.M.md      │
                                         ▼                      │
                                  ┌─────────────┐               │
                                  │    Dev      │               │
                                  │   (James)   │               │
                                  └──────┬──────┘               │
                                         │                      │
                                         │ branch + tests +     │
                                         │ story marked "review"│
                                         ▼                      │
                                  ┌─────────────┐               │
                                  │     QA      │   pass        │
                                  │   (Quinn)   │───────────────┘
                                  └──────┬──────┘
                                         │ fail
                                         ▼
                                   back to Dev
```

### Artifacts produced in Phase 2
| Artifact | Produced by | Location |
|---|---|---|
| Story file | SM | `artifacts/stories/NN.M-slug.md` |
| Implementation | Dev | Code branch + commit |
| Changelog entry | Dev | `CHANGELOG.md` |
| Quality gate verdict | QA | Appended to story file under "QA Results" |

---

## State machine: a story's life

Each story file has a `status:` frontmatter field that moves through this lifecycle:

```
drafted ─▶ ready ─▶ in-progress ─▶ review ─▶ done
   ▲          │                        │
   │          │                        ▼
   └──────────┴──────────────── needs-changes
```

| State | Owner | Meaning |
|---|---|---|
| `drafted` | SM | Written but not reviewed by PO |
| `ready` | PO | AC sharp, dependencies clear, ready for dev |
| `in-progress` | Dev | James is actively building |
| `review` | QA | Dev thinks it's done; QA verifying |
| `needs-changes` | Dev | QA found issues; back to Dev |
| `done` | — | Merged to main + changelog updated |

---

## Handoff contracts (what each agent owes the next)

### Analyst → PM
**Deliverable:** project brief with problem statement, target user, success metrics.
**Quality bar:** PM should be able to write a PRD without re-interviewing the user.

### PM → Architect
**Deliverable:** PRD with feature list, non-goals, data model sketch, external dependencies.
**Quality bar:** Architect should be able to design the system without asking "what does this feature do?"

### Architect → UX Expert
**Deliverable:** architecture doc listing components, API endpoints, page routes.
**Quality bar:** UX Expert should know every screen that needs a wireframe.

### UX Expert → PO
**Deliverable:** front-end spec with wireframes, interaction patterns, component inventory.
**Quality bar:** PO should have enough to define acceptance criteria at a pixel level.

### PO → SM
**Deliverable:** sharded epic files with epic-level AC, ordered story backlog.
**Quality bar:** SM should be able to pick the next story without re-reading the main PRD.

### SM → Dev
**Deliverable:** fully context-engineered story file — business why + AC + tech guidance + file list + test plan.
**Quality bar:** Dev should not need to read the PRD, architecture doc, or UX spec to implement the story.

### Dev → QA
**Deliverable:** working code on a branch, self-tested, story status = `review`.
**Quality bar:** QA should not be finding typos or missing cases that Dev could have caught.

### QA → PO
**Deliverable:** pass/fail verdict, risk notes, coverage assessment.
**Quality bar:** PO trusts the verdict and can release the story as `done`.

---

## When to break the flow

BMAD is disciplined but not rigid. Skip steps when:

- **Trivial fixes** (typo, copy change): Dev can edit directly, no SM ceremony.
- **Spike / prototype**: skip AC; time-boxed to 1 session; output is a learning, not code.
- **Incident / hotfix**: Dev + QA only; PM/PO review after.
- **ADR-only changes**: Architect writes ADR, updates affected epic files, no code ceremony.

Every broken step must be **noted in the story or ADR** so we don't lose the thread.

---

## First few sessions — suggested order

Given we already have the main PRD done (it was created in PM mode), here's what I'd run next:

1. **Architect (Winston)** — Create `artifacts/architecture.md` with system diagram, folder structure, external API adapters, cron schedule. Output 3–5 foundational ADRs (Supabase Auth config, Prisma setup, price-feed adapter pattern, error-handling convention, cron scheduling).
2. **UX Expert (Sally)** — Create `artifacts/front-end-spec.md` with wireframes for: login, dashboard, quick expense entry, investment list, budget setup.
3. **PO (Sarah)** — Review epic files 01–07 for internal consistency and dependency ordering; mark Epic 01's first slice as `ready`.
4. **SM (Bob)** — Create `stories/01.1-google-oauth-signup.md` using all upstream artifacts as context.
5. **Dev (James)** — Build it.
6. **QA (Quinn)** — Review it.

That's one end-to-end loop. Everything after is repetition.
