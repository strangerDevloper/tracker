# ADR-0001: Next.js App Router + React Server Components over Pages Router

**Status:** Accepted
**Date:** 2026-04-24
**Deciders:** Winston (Architect), Tushar (Owner)

---

## Context

We need a web framework for a solo-maintained, form-heavy app with a dashboard that will later accept inbound webhooks (WhatsApp, v2). The choice shapes how components render, how data is fetched, how forms are handled, how auth is enforced, and how APIs are exposed.

Forces at play:
- Solo developer — every extra mental model has a cost.
- Heavy form UI (expense entry = the most-used flow).
- API-first requirement for v2 WhatsApp integration.
- Deployment on Vercel (managed; user-selected).
- Dashboard analytics with moderate interactivity.

---

## Options considered

### 1. Next.js 15 — App Router with React Server Components
- ✅ Server Components default → smaller client bundles → faster mobile.
- ✅ Server Actions → form writes without `/api` boilerplate.
- ✅ Native file-based API routes → clean WhatsApp webhook endpoint later.
- ✅ Streaming + partial rendering → dashboard cards load independently.
- ⚠️ Two mental models (server vs. client components) — learning curve.
- ⚠️ Some libraries (especially chart libs) only work in client components.

### 2. Next.js — Pages Router (classic)
- ✅ Simpler, single mental model (everything is a client component by default).
- ✅ Mature, lots of tutorials.
- ❌ Heavier client bundles.
- ❌ `getServerSideProps` pattern is clunkier than RSC + Server Actions.
- ❌ Being deprioritized by Vercel; new features land on App Router first.

### 3. Remix / React Router v7
- ✅ Cleaner data-loading story than either Next.js approach.
- ✅ Type-safe loaders/actions.
- ❌ Smaller community, fewer examples (matters for AI-assisted dev).
- ❌ Vercel hosts it but it's not the native path.

### 4. SvelteKit / Nuxt / Astro / Qwik
- ✅ Each has technical merits.
- ❌ Non-React means re-learning an ecosystem for a solo dev.
- ❌ Smaller component ecosystems; weaker AI-coding support.

---

## Decision

**We will use Next.js 15 with the App Router and React Server Components.**

---

## Rationale

1. **Form-heavy + money-critical app → Server Actions win.** Expense entry is the most-used flow. Server Actions eliminate client-side fetch choreography and the bug class that comes with it. For an app where a dropped form submit could mean a lost transaction, fewer moving parts is a safety win, not just a DX win.

2. **API-first is free, not a future migration.** File-based `/api/*` routes are just HTTP endpoints. The WhatsApp webhook in v2 becomes `app/api/webhooks/whatsapp/route.ts` and calls the same domain functions the Server Actions use. Zero duplication.

3. **RSC bundle advantage matters on mobile.** We're mobile-equal-priority (Epic 06 perf target: <2s mobile). Shipping less JS to the client is the biggest lever.

4. **AI-coding support is strongest here.** Solo dev + LLM pair-programming. Next.js + TypeScript has the densest training data; Claude/ChatGPT produce correct App Router code ~80% first try. Remix or SvelteKit are technically fine but the AI gap is real and compounds across thousands of iterations.

5. **Pages Router is on its way out.** Betting on the deprioritized path is a needless liability.

### Trade-offs knowingly accepted
- The RSC/Client boundary requires care (e.g., `"use client"` directives, can't pass functions as props across the boundary). We accept this cost for the bundle + Server Actions wins.
- Some shadcn patterns differ between RSC and classic React. We use the App Router variants from the shadcn docs.

### Rejected options in short
- **Pages Router:** deprecated direction; no.
- **Remix:** fine, but AI-coding gap + smaller ecosystem not worth it for a solo dev.
- **Svelte/Nuxt/Astro/Qwik:** not worth abandoning React for.

---

## Consequences

- ✅ Smallest client bundles available without native.
- ✅ WhatsApp webhook integration is a one-file addition in v2.
- ✅ Forms are simpler and safer than client-state + fetch.
- ⚠️ Junior-Claude pitfall: passing a function as a prop from a server component to a client component breaks. Code review rule: if you see a prop typed `() => void` crossing the `"use client"` boundary, stop.
- ⚠️ `useEffect`-based data fetching is an anti-pattern here. Data fetching belongs in RSCs or in Server Actions' revalidation, not client-side effects.
- 🔁 Reversibility: migrating to Pages Router or Remix later is possible but not trivial — would touch most components. Low risk given the above rationale.

---

## References

- [Next.js App Router docs](https://nextjs.org/docs/app)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- Main PRD §8 (tech stack), architecture.md §2
