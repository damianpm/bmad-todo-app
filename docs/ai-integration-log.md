# AI Integration Log

> Running record of how AI agents and MCP tools assisted the BMAD-driven development of this Todo app. Updated continuously through Steps 1–4.

## Step 1 — Initialize BMAD and generate specifications

### Tooling used in Step 1

| Tool | Purpose | Notes |
|---|---|---|
| Claude Code (Opus 4.7) | Orchestration, plan-mode planning, executing each agent role | Plan mode used to design Step 1; auto mode used to execute |
| `npx bmad-method install` | Installed BMAD framework v6.5.0 with `core` + `bmm` modules and `claude-code` IDE integration | Non-interactive flags used: `--modules bmm --tools claude-code --user-name Damian --yes` |
| BMAD skill files (`.claude/skills/bmad-*`) | Authored specifications | See "Skill registration finding" below |
| WebFetch / WebSearch | Researched BMAD docs, current React / Node versions | React 19.2.5 and Node 24 LTS picked over outdated defaults after a user prompt |

### Skill registration finding (load-bearing)

Skills installed by `npx bmad-method install` land in `.claude/skills/<name>/SKILL.md`, but Claude Code only registers skills at session start. Skills installed mid-session are **not** auto-discoverable via the `Skill` tool until the session reloads.

**Workaround used:** Read each `SKILL.md` and execute its instructions inline as Claude playing the agent persona. The output is functionally identical because BMAD skills *are* prompt files — invoking them via the Skill tool just loads the same instructions into context.

**Implication for the assignment write-up:** When the README documents "we used BMAD", it is accurate but should note that skill dispatch was substituted with inline execution due to the session-lifecycle limitation. A `/clear` between install and use would have enabled native dispatch.

### Installer bug (worked around)

The installer left an unsubstituted `{output_folder}` placeholder in two places:
- A literal `{output_folder}` directory was created instead of `_bmad-output`.
- `_bmad/config.toml` and `_bmad/bmm/config.yaml` contain `{output_folder}` as a string in `planning_artifacts` and `implementation_artifacts`.

Fix: renamed the directory to `_bmad-output` and substituted the placeholder in both config files. Reported as a finding for the BMAD project; not a blocker.

### Per-agent log

#### 1. Analyst "Mary" — `bmad-product-brief`
- **Prompt summary:** `--autonomous` mode with the source PRD as input and locked stack constraints. Produce a project brief without re-elicitation.
- **Output:** `_bmad-output/planning-artifacts/project-brief.md`
- **What worked:** The skill's stage-4 draft template is well-shaped (executive summary, problem, target user, vision, scope, success criteria, constraints, risks, dependencies, hand-off). Following that structure produced a brief immediately useful to the PM step.
- **What was missing / iterated:** The skill defaults to a deeply collaborative, multi-question stage 1 ("Understand intent"). With locked constraints that's pure overhead — autonomous mode skipping it was the right call.
- **Human judgment load-bearing:** Picking which v1 exclusions to call out explicitly (edit-text, drag-reorder, etc.). The source PRD was vague; the brief had to be assertive.

#### 2. PM "John" — `bmad-create-prd`
- **Prompt summary:** Synthesize a PRD from brief + source PRD. Lock entity schema, operations, NFR thresholds, and epic outline so the Architect has unambiguous constraints.
- **Output:** `_bmad-output/planning-artifacts/prd.md`
- **What worked:** Frontmatter `stepsCompleted` array gave a clean way to record the 12-step skeleton without actually walking each menu interactively. FR-1 through FR-8 plus NFR-1 through NFR-12 produced a checkable surface area.
- **What was missing / iterated:** The skill's strict step-by-step protocol (with menus and `C` continuation) is a bad fit for headless / autonomous use. The skill could benefit from a `--yolo` mode like `bmad-product-brief` has.
- **Human judgment load-bearing:** Calling out edit-text-of-existing-todo as an open question rather than silently picking. Locking sort order to `created_at DESC`. Picking error-shape candidates (custom vs. RFC 7807) for Architect to decide.

#### 3. Architect "Winston" — `bmad-create-architecture`
- **Prompt summary:** With the PRD and locked stack, produce a comprehensive architecture document with diagrams, ERD, OpenAPI contract, env schema, and ADRs.
- **Output:** `_bmad-output/planning-artifacts/architecture.md`
- **What worked:** Concentrating the open decisions in numbered ADRs (ORM choice, optimistic-UI mechanism, error format, healthcheck shape, migrations on startup, monorepo vs. multi-repo) gives the Dev agent in Step 2 a clear `Why` for each choice. ASCII diagrams render fine in Markdown and don't require an external tool.
- **What was missing / iterated:** The skill expects to draft architecture conversationally with the user; in autonomous mode I had to self-supply the typical "what trade-offs are you OK with?" answers. Recorded as ADR rationale rather than glossed.
- **Human judgment load-bearing:** Choosing Drizzle over Prisma (smaller container, no codegen step). Choosing custom error shape over RFC 7807 (overhead not worth it for a one-team API). Choosing migrations-on-startup over a separate migrator service (simplicity wins for v1).

#### 4. PM/SM — Epics & E1 stories
- **Prompt summary:** Produce 5 epic files and fully-expanded stories for E1 only.
- **Output:** `_bmad-output/planning-artifacts/epics/E[1-5]-*.md` and `_bmad-output/planning-artifacts/stories/E1-S[1-5]-*.md`
- **What worked:** Splitting story drafting into "now" (E1) and "just-in-time during Step 2" (E2-E5) keeps stories fresh against the actual code state and avoids re-work when reality contradicts the plan. Story files use Given/When/Then ACs, three test levels, dependencies, and a Definition of Done — same shape `bmad-create-story` would produce.
- **What was missing:** No SM persona was invoked separately — PM-style epic outlining flowed directly into story files for E1.
- **Human judgment load-bearing:** Choosing 5 stories for E1 (not 3, not 10). Sequencing dependencies (S2/S3/S4 all depend on S1; S5 depends on S2-S4).

### What AI didn't / couldn't do well in Step 1

- **Discover skills installed mid-session.** Required manual workaround (reading `SKILL.md` and inlining).
- **Substitute the installer's `{output_folder}` template variable.** Required manual fix.
- **Decide tech versions without prompting.** Defaulted to outdated React 18 / Node 20 until corrected.

### Where human expertise was load-bearing in Step 1

- Calling out outdated default versions (React 18 → 19, Node 20 → 24).
- Choosing PostgreSQL sidecar over SQLite to honor the assignment's docker-compose multi-service requirement.
- Refusing to silently include "edit-text-of-existing-todo" — flagged as an open question rather than assumed.
- Catching that the BMAD installer left a literal `{output_folder}` directory.

---

(Future steps will append below.)
