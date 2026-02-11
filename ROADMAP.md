# Ingents Vertical AI Agent Roadmap (2026)

> Scope: turn the existing RAG + scheduler + services stack into a goal-driven **work agent** that can plan, execute, and audit tasks across tools.

## Timeline Overview

- **Phase 0 (Week 0–1)** — Foundations & alignment
- **Phase 1 (Week 2–4)** — Agent orchestration MVP
- **Phase 2 (Week 5–8)** — Tool routing + memory + guardrails
- **Phase 3 (Week 9–12)** — Multi-agent workflows + reliability
- **Phase 4 (Week 13–16)** — Productization + analytics

---

## Phase 0 — Foundations & Alignment (Week 0–1)

**Goal:** confirm requirements, stability, and environment.

### Deliverables
- ✅ `PROGRESS.md` baseline (done)
- Environment readiness checklist (Mongo, Redis, AWS, email)
- Minimal CI health checks (build + typecheck)

### Exit Criteria
- Build and typecheck green
- Redis + scheduler available in dev

---

## Phase 1 — Agent Orchestration MVP (Week 2–4)

**Goal:** introduce a single-agent planner + executor loop.

### Deliverables
- `services/agents/executor` (planner → tool router → result)
- `/api/v1/agent/run` endpoint
- Minimal `task_runs` schema for execution trace
- Basic prompt templates for planning

### Exit Criteria
- Agent can execute 3–5 core actions:
  - send email
  - schedule social post
  - create calendar meeting
  - generate copy with RAG

---

## Phase 2 — Tool Routing + Memory + Guardrails (Week 5–8)

**Goal:** make the agent reliable and safe.

### Deliverables
- Tool registry with permissions + scopes
- Persistent memory links to `tasks` + `userChatHistory`
- Structured tool call schema and audit logs
- Input validation + rate limits

### Exit Criteria
- Full trace of actions with success/failure
- Safe retries and idempotency for core tools

---

## Phase 3 — Multi-Agent Workflows + Reliability (Week 9–12)

**Goal:** enable complex workflows and higher autonomy.

### Deliverables
- Task decomposition into sub-agents
- Parallel tool execution and orchestration
- SLA monitoring for long-running tasks
- Failure recovery policies

### Exit Criteria
- End-to-end workflow (campaign planning → execution → report)
- Stable worker processes under load

---

## Phase 4 — Productization + Analytics (Week 13–16)

**Goal:** measurable outcomes and product readiness.

### Deliverables
- Execution analytics dashboard
- Cost + token usage tracking
- Role-based access controls for agent abilities
- Ops docs + runbooks

### Exit Criteria
- Ops dashboard running
- Agent usage metrics stored and visualized

---

## Immediate Next Steps (This Week)

1. Implement agent executor MVP scaffolding
2. Add `task_runs` schema + API routes
3. Wire tool registry for 3–5 core actions

---

## Notes
- Timelines assume 1–2 engineers; scale accordingly.
- Phases can overlap once MVP is stable.
