# GHOST Visual — Hackathon Build Spec

## 1. Concept

**GHOST** is an agent that lives *between* the tools people already use.

Instead of waiting for the user to open a chatbot and explain what they are doing, GHOST observes the sequence of work across applications, keeps track of the entities and information encountered, and progressively infers the user's current intent.

The core idea:

> **Every app understands what happens inside it. GHOST understands why you move between them.**

For the hackathon MVP, GHOST will be demonstrated inside a simulated browser workspace containing several work applications (Email, Slack, GitHub, CRM). The applications are simple but functional enough to generate real interaction events.

As the user investigates a customer issue, GHOST builds a live visual graph of the context and updates its inferred intent.

When the user returns to the original email and clicks **Reply**, GHOST recognizes that the investigation phase has reached an action phase and offers to draft a grounded response using the context gathered during the workflow.

The user never has to manually explain the situation to the agent.

> **The prompt isn't what you type. The prompt is what you do.**

---

## 2. Hackathon alignment

The project is designed around the hackathon theme:

> *Agents are leaving the chatbox.*

GHOST is not primarily a conversational interface. Its input is the user's behavior inside a work environment.

The environment is essential because the agent learns from:

- which application the user visits;
- which object or entity they open;
- the order in which they visit those objects;
- which facts appear repeatedly across applications;
- when the user returns to the original task;
- when the workflow transitions from investigation to action.

This context would normally have to be manually reconstructed and pasted into a chatbot.

With GHOST, the workflow itself becomes the input.

---

# 3. MVP demo scenario

## Starting situation

The user opens an email from **Sarah at ACME**.

Example:

> Hi,
>
> We've been experiencing payment failures again this week.
> This is becoming a serious concern ahead of our renewal.
>
> Can you tell me what's happening and what you're doing about it?
>
> Sarah

GHOST is already visible in a sidebar.

Initially:

- entity: ACME;
- entity: Sarah;
- entity: payment failures;
- inferred intent: `Investigate customer issue`;
- confidence: ~40%.

No prompt is entered.

---

## Step 1 — Slack

The user navigates to a Slack-like application and opens a relevant engineering conversation.

Example information:

- failures only affect the EU region;
- they began after the latest deployment.

GHOST receives an application event, extracts useful entities and facts, and updates the visual graph.

Example:

```text
ACME
 │
 └── payment failures
          │
       EU region
          │
    recent deployment
```

Intent becomes:

> `Understand ACME payment incident`

Confidence increases.

---

## Step 2 — GitHub

The user opens GitHub issue `#4821`.

Example information:

- EU payment timeouts;
- root cause: routing configuration;
- fix deployed at 14:32;
- error rate has returned to normal.

The graph grows:

```text
                ACME
                  │
          payment failures
                  │
             EU region
                  │
          Incident #4821
            /          \
      root cause       status
          │              │
   routing config     FIXED ✓
```

Intent becomes:

> `Respond to ACME with incident resolution`

---

## Step 3 — CRM

The user opens ACME in the CRM.

Relevant information:

- ARR: €120,000;
- renewal in 19 days;
- account status: at risk.

GHOST now understands the business consequence of the incident.

Final inferred intent:

> **Resolve ACME escalation and protect renewal**

Confidence: ~95–98%.

The visual graph reorganizes around this intent.

---

## Step 4 — Return to email

The user returns to the original email and clicks **Reply**.

This is treated as a meaningful transition:

```text
investigation → action
```

GHOST displays:

> **Here's what you learned since opening this email.**

Useful context:

- EU-only incident;
- routing configuration root cause;
- fix deployed at 14:32;
- error rate normalized;
- ACME ARR: €120k;
- renewal in 19 days.

GHOST proposes:

> **Draft response using this context**

The user clicks once.

A response is generated directly inside the email composer.

---

# 4. Core product behavior

The MVP has five core capabilities.

## A. Event capture

Each simulated application emits structured events when the user interacts with it.

Example:

```json
{
  "type": "OPEN_ENTITY",
  "app": "github",
  "entityType": "issue",
  "entityId": "4821",
  "timestamp": 1720000000
}
```

No OS-level tracking is needed for the hackathon.

The browser workspace itself is instrumented.

---

## B. Context extraction

When an event occurs, the relevant content from the current application is sent to the agent.

Example input:

```json
{
  "app": "github",
  "page": "Issue #4821",
  "content": "EU payment timeouts caused by routing configuration..."
}
```

The model returns structured context:

```json
{
  "entities": [
    {"name": "ACME", "type": "customer"},
    {"name": "#4821", "type": "incident"},
    {"name": "EU", "type": "region"}
  ],
  "facts": [
    "Payment failures affect EU customers",
    "Root cause is routing configuration",
    "Fix deployed at 14:32"
  ]
}
```

---

## C. Live context graph

The frontend stores entities, facts and relationships as a lightweight graph.

Example:

```ts
type Node = {
  id: string;
  label: string;
  type: "person" | "company" | "incident" | "fact" | "app";
};

type Edge = {
  source: string;
  target: string;
  label?: string;
};
```

The graph is rendered in the GHOST sidebar.

It should animate as new context is added.

This graph is the central visual element of the demo.

---

## D. Intent inference

After each meaningful navigation event, the agent receives:

- the current graph;
- recent transitions;
- the latest application context.

It returns:

```json
{
  "intent": "Resolve ACME escalation and protect renewal",
  "confidence": 0.96,
  "reasoningSignals": [
    "Customer reports payment failures",
    "User investigated active engineering incident",
    "Customer renews in 19 days",
    "User returned to compose a response"
  ]
}
```

Only the structured result is shown in the UI.

The goal is not to expose chain-of-thought, but to show understandable evidence supporting the inferred intent.

---

## E. Contextual action

When the user returns to Email and clicks Reply, GHOST detects that the workflow has reached an action boundary.

It offers one action:

> **Draft reply**

The generated response uses the accumulated context and can optionally display source provenance:

```text
"EU payment issue"
↳ Slack

"routing configuration"
↳ GitHub #4821

"fix deployed at 14:32"
↳ GitHub #4821

"renewal in 19 days"
↳ CRM
```

This gives the agent transparency and makes the demo more credible.

---

# 5. What we deliberately do NOT build

To finish reliably within the hackathon window, the MVP will **not** include:

- a real Chrome extension;
- operating-system-wide activity tracking;
- real Slack authentication;
- real GitHub authentication;
- real Gmail authentication;
- a database;
- user accounts;
- long-term memory;
- autonomous background actions;
- multi-agent orchestration;
- "find missing context";
- arbitrary websites;
- production-grade security or permissions.

The demo workspace contains realistic simulated versions of the applications.

The intelligence, graph construction, event processing, intent inference and draft generation are real.

---

# 6. Recommended technical stack

The priority is **speed, simplicity and demo reliability**.

## Frontend + backend: Next.js + TypeScript

Use:

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**

Why:

- one repository;
- frontend and API routes in the same project;
- very quick to scaffold;
- easy deployment;
- CopilotKit's official quickstart uses Next.js because the frontend and runtime can live in the same project. citeturn321781search0

Suggested structure:

```text
/app
  /page.tsx
  /api/ghost/route.ts

/components
  GhostSidebar.tsx
  ContextGraph.tsx
  MockEmail.tsx
  MockSlack.tsx
  MockGithub.tsx
  MockCRM.tsx

/lib
  ghost-store.ts
  event-types.ts
  prompts.ts
```

---

## Agent layer: OpenAI Agents SDK for TypeScript

Use:

```bash
npm install @openai/agents zod
```

The official SDK is intentionally small, supports tools and structured workflows, and includes tracing. citeturn321781search1turn321781search2

For this MVP, use **one agent only**.

Do not implement handoffs or multiple specialist agents unless everything else is already complete.

The GHOST agent has three jobs:

1. extract structured context;
2. infer current intent;
3. generate the final email draft.

Possible tools can be implemented as simple local functions:

```ts
recordContext()
updateIntent()
draftReply()
```

The Agents SDK supports function tools with Zod schemas, making structured calls quick to implement. citeturn321781search1

---

## Structured outputs: Zod

Use Zod schemas for every LLM response.

Example:

```ts
const GhostUpdate = z.object({
  entities: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z.string()
    })
  ),
  facts: z.array(z.string()),
  relationships: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      label: z.string().optional()
    })
  ),
  intent: z.string(),
  confidence: z.number().min(0).max(1)
});
```

This prevents fragile free-form parsing during the demo.

---

## GHOST state: React/Zustand, in memory

Use either:

- React Context; or
- **Zustand**.

Recommended: Zustand if already familiar with it.

Store:

```ts
{
  events: [],
  nodes: [],
  edges: [],
  facts: [],
  intent: "",
  confidence: 0,
  currentApp: "",
  originalEmailId: ""
}
```

No database.

Refreshing the page can reset the demo.

That is acceptable and desirable for hackathon reliability.

---

## Graph visualization: React Flow

Recommended:

```bash
npm install @xyflow/react
```

Use React Flow for:

- nodes;
- edges;
- animated graph updates;
- simple layout;
- zoom/pan if useful.

Do not spend time building a graph renderer manually.

The graph should visually evolve, but the layout can be mostly deterministic to keep the demo polished.

---

## UI layer: CopilotKit — optional but strategically useful

CopilotKit is an official hackathon resource and its React integration is designed to work with Next.js and other React frameworks. citeturn321781search0

However:

**Do not make CopilotKit a dependency for the core workflow if it slows development.**

Priority:

1. working GHOST;
2. polished demo;
3. CopilotKit integration.

If easy, use CopilotKit for the agent action/UI layer or as part of the GHOST sidebar.

This also makes the project eligible to demonstrate meaningful use of a hackathon partner.

---

# 7. Simplified architecture

```text
┌─────────────────────────────────────────┐
│            Browser Workspace            │
│                                         │
│ Email │ Slack │ GitHub │ CRM            │
└───────────────────┬─────────────────────┘
                    │ UI events
                    ▼
          ┌──────────────────┐
          │   Event Store    │
          │  (Zustand/React) │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ GHOST API Route  │
          │   Next.js        │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ OpenAI Agent SDK │
          │                  │
          │ extract context  │
          │ infer intent     │
          │ draft response   │
          └────────┬─────────┘
                   │ structured JSON
                   ▼
          ┌──────────────────┐
          │   GHOST State    │
          └────────┬─────────┘
                   │
          ┌────────┴──────────┐
          ▼                   ▼
   Context graph        Intent / actions
   React Flow           GHOST sidebar
```

---

# 8. Suggested data model

## Event

```ts
type GhostEvent = {
  id: string;
  timestamp: number;
  app: "email" | "slack" | "github" | "crm";
  action: "OPEN" | "VIEW_ENTITY" | "REPLY";
  entityId?: string;
  payload?: Record<string, unknown>;
};
```

## Fact

```ts
type GhostFact = {
  id: string;
  text: string;
  sourceApp: string;
  sourceId: string;
};
```

## Intent state

```ts
type IntentState = {
  label: string;
  confidence: number;
  evidence: string[];
};
```

---

# 9. Agent prompt principles

The agent should:

- infer intent conservatively;
- update its hypothesis as new context appears;
- reuse previous structured context;
- never invent facts;
- attach provenance to facts;
- keep output terse;
- avoid suggesting actions before the workflow reaches an appropriate action boundary.

Example instruction:

```text
You are GHOST, an ambient work-context agent.

You receive a sequence of application events and structured page contexts.

Your job is to:
1. extract entities and factual relationships;
2. maintain a coherent representation of the user's current task;
3. infer the user's likely goal conservatively;
4. update confidence as evidence accumulates;
5. preserve source provenance for every factual claim.

Do not behave like a chatbot.
Do not ask the user questions.
Do not invent missing information.
```

---

# 10. Build order

## Phase 1 — Static demo shell

Build four mock apps:

- Email;
- Slack;
- GitHub;
- CRM.

Add navigation between them.

Hard-code the ACME scenario.

Goal: the entire manual workflow should already be clickable without any AI.

---

## Phase 2 — GHOST sidebar

Add:

- event timeline;
- intent label;
- confidence indicator;
- context graph.

Initially use hard-coded updates.

Goal: achieve the visual demo before connecting the model.

---

## Phase 3 — Agent integration

Replace hard-coded extraction and intent updates with real calls through the OpenAI Agents SDK.

Use strict Zod outputs.

Goal:

```text
interaction
→ context extraction
→ graph update
→ intent update
```

working end to end.

---

## Phase 4 — Reply action

When the user clicks Reply:

- pass all accumulated grounded facts to GHOST;
- generate the email response;
- place it in the composer;
- show provenance in the sidebar.

This completes the core loop.

---

## Phase 5 — Polish and reliability

Only after the complete flow works:

- graph animations;
- nicer transitions;
- loading states;
- confidence animation;
- source badges;
- final visual polish;
- CopilotKit integration if useful.

---

# 11. Demo success criteria

The MVP is successful if the following sequence works reliably:

```text
Open customer email
        ↓
Visit Slack
        ↓
GHOST graph grows
        ↓
Visit GitHub
        ↓
GHOST graph grows
        ↓
Visit CRM
        ↓
GHOST infers high-confidence intent
        ↓
Return to email
        ↓
Click Reply
        ↓
GHOST restores useful context
        ↓
Click Draft Reply
        ↓
Grounded email appears
```

No manual prompt should be required.

---

# 12. Main demo message

The audience should understand three things without needing a technical explanation:

### 1. GHOST watches the workflow, not just one application

The context graph visibly grows as the user moves through their work.

### 2. GHOST understands why those pieces belong together

It progressively infers:

> **Resolve ACME escalation and protect renewal**

### 3. GHOST uses that understanding at the right moment

When the user returns to Reply, the information gathered across applications is immediately usable.

---

# 13. One-sentence pitch

> **GHOST is the agent that lives between your apps: it follows the context you carry through your work, understands what you're trying to achieve, and brings it back when you're ready to act.**

Alternative punchline:

> **The prompt isn't what you type. The prompt is what you do.**

---

# 14. Recommended MVP stack summary

| Layer | Choice | Why |
|---|---|---|
| App | Next.js + TypeScript | Single fast full-stack project |
| Styling | Tailwind CSS | Fast UI iteration |
| Agent | OpenAI Agents SDK JS | Official hackathon resource, tools + tracing |
| Schemas | Zod | Reliable structured LLM outputs |
| State | Zustand / React state | No backend persistence required |
| Graph | React Flow | Fast visual graph implementation |
| Agent UI | CopilotKit (optional) | Official sponsor integration |
| Database | **None** | Avoid unnecessary complexity |
| Auth | **None for MVP** | Simulated workspace |
| External apps | **Mocked UI** | Maximum demo reliability |

---

# 15. Guiding principle

If a feature does not improve this 2-minute story, do not build it.

The product only needs one workflow that feels magical and works every time.
