# Epic E3 — Frontend UI

**Goal:** Build the React 19 + Vite SPA that consumes the API and delivers the user journeys defined in PRD § 3.

**Outcome:** A polished, responsive, accessible UI satisfying FR-1 through FR-4, FR-6 through FR-8, NFR-3, and NFR-6.

## Acceptance criteria (epic-level)

- App boots and lists todos within 2 s on a mid-range laptop (cold cache, dev mode)
- All four CRUD verbs exposed in the UI (list, add, toggle, delete)
- Optimistic UI on add/toggle/delete using React 19 `useOptimistic`; rolls back cleanly on API failure
- Empty state, loading state, and error state are each visually distinct and tested
- Completed todos are visually distinct from active (strikethrough + muted color — not color alone)
- Layout works on desktop (≥ 1024 px) and mobile (320–600 px) with comfortable tap targets
- TanStack Query manages server cache; the create form uses React 19 `useActionState`
- All UI components are unit-tested (React Testing Library + Vitest)
- ≥ 5 Playwright E2E specs pass: create, toggle, delete, empty state, error state
- Zero critical axe-core violations on the main view (axe-core runs inside the Playwright suite)
- Coverage ≥ 70 % line on `packages/web/src/**`

## Out of scope for E3

- Editing todo text (deferred)
- Drag-to-reorder
- Dark mode / theming
- i18n

## Stories

Drafted just-in-time. Likely shape:

- E3-S1 — App shell, routing-less layout, TanStack Query provider
- E3-S2 — `useTodos` hook (Query + mutations + useOptimistic)
- E3-S3 — `TodoList` + `TodoItem` (toggle + delete)
- E3-S4 — `AddTodoForm` (useActionState)
- E3-S5 — Empty / loading / error state components
- E3-S6 — Responsive styles, a11y polish
- E3-S7 — Playwright E2E specs + axe-core integration
