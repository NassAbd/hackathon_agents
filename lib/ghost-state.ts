import { facts as catalog, type AppId, type Fact } from "./fixtures";
import { EventSchema, type GhostEvent, type Intent } from "./schemas";
export type GhostNode = {
  id: string;
  label: string;
  detail: string;
  app: AppId;
  x: number;
  y: number;
  factIds: string[];
};
export type GhostEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};
export type GhostState = {
  currentApp: AppId;
  visited: AppId[];
  events: GhostEvent[];
  facts: Fact[];
  nodes: GhostNode[];
  edges: GhostEdge[];
  intent: Intent;
  returned: boolean;
  boundary: boolean;
};
const nodes: GhostNode[] = [
  {
    id: "acme",
    label: "ACME",
    detail: "CUSTOMER",
    app: "email",
    x: 144,
    y: 10,
    factIds: ["concern"],
  },
  {
    id: "sarah",
    label: "Sarah Chen",
    detail: "CONTACT",
    app: "email",
    x: 4,
    y: 10,
    factIds: ["concern"],
  },
  {
    id: "payments",
    label: "Payment failures",
    detail: "CUSTOMER ISSUE",
    app: "email",
    x: 144,
    y: 75,
    factIds: ["concern"],
  },
  {
    id: "eu",
    label: "EU region",
    detail: "IMPACT",
    app: "slack",
    x: 4,
    y: 140,
    factIds: ["eu"],
  },
  {
    id: "deployment",
    label: "Latest deploy",
    detail: "STARTED AFTER",
    app: "slack",
    x: 4,
    y: 205,
    factIds: ["deploy"],
  },
  {
    id: "incident",
    label: "Incident #4821",
    detail: "GITHUB ISSUE",
    app: "github",
    x: 144,
    y: 140,
    factIds: ["cause"],
  },
  {
    id: "cause",
    label: "Routing config",
    detail: "ROOT CAUSE",
    app: "github",
    x: 144,
    y: 205,
    factIds: ["cause"],
  },
  {
    id: "fixed",
    label: "Fixed · 14:32",
    detail: "ERRORS NORMAL",
    app: "github",
    x: 284,
    y: 205,
    factIds: ["fix", "normal"],
  },
  {
    id: "renewal",
    label: "Renewal · 19d",
    detail: "€120K ARR",
    app: "crm",
    x: 284,
    y: 10,
    factIds: ["renewal", "arr"],
  },
  {
    id: "risk",
    label: "At risk",
    detail: "ACCOUNT HEALTH",
    app: "crm",
    x: 284,
    y: 75,
    factIds: ["risk"],
  },
];
const relationships = [
  ["sarah", "acme", "contact"],
  ["acme", "payments", "reported"],
  ["payments", "eu", "affects"],
  ["eu", "deployment", "after"],
  ["payments", "incident", "tracked in"],
  ["incident", "cause", "caused by"],
  ["incident", "fixed", "resolved"],
  ["acme", "renewal", "renews"],
  ["renewal", "risk", "at stake"],
  ["payments", "risk", "threatens"],
];
export function inferIntent(facts: Fact[]): Intent {
  const has = (id: string) => facts.some((f) => f.id === id);
  const evidenceIds = ["concern", "eu", "cause", "fix", "renewal"].filter(has);
  if (has("fix") && has("renewal") && has("eu"))
    return {
      label: "Resolve ACME escalation and protect renewal",
      confidence: 0.97,
      evidenceIds,
    };
  if (has("fix"))
    return {
      label: "Respond to ACME with incident resolution",
      confidence: has("eu") ? 0.9 : 0.8,
      evidenceIds,
    };
  if (has("eu"))
    return {
      label: "Understand ACME payment incident",
      confidence: has("renewal") ? 0.78 : 0.7,
      evidenceIds,
    };
  if (has("renewal"))
    return {
      label: "Investigate ACME issue ahead of renewal",
      confidence: 0.6,
      evidenceIds,
    };
  return { label: "Investigate customer issue", confidence: 0.4, evidenceIds };
}
export function contextFromFacts(facts: Fact[]) {
  const ids = new Set(facts.map((f) => f.id));
  const visibleNodes = nodes.filter((n) =>
    n.factIds.every((id) => ids.has(id)),
  );
  const nodeIds = new Set(visibleNodes.map((n) => n.id));
  return {
    nodes: visibleNodes,
    edges: relationships
      .filter(([source, target]) => nodeIds.has(source) && nodeIds.has(target))
      .map(([source, target, label]) => ({
        id: `${source}-${target}`,
        source,
        target,
        label,
      })),
  };
}
export function initialState(): GhostState {
  const facts = catalog.filter((f) => f.app === "email");
  return {
    currentApp: "email",
    visited: ["email"],
    events: [
      { id: "initial-email", app: "email", action: "OPEN", timestamp: 0 },
    ],
    facts,
    ...contextFromFacts(facts),
    intent: inferIntent(facts),
    returned: false,
    boundary: false,
  };
}
export function reduceEvent(state: GhostState, input: GhostEvent): GhostState {
  const event = EventSchema.parse(input);
  if (state.events.some((e) => e.id === event.id)) return state;
  if (
    event.action !== "OPEN" &&
    (event.app !== "email" || state.currentApp !== "email")
  )
    return state;
  const visited =
    event.action === "OPEN"
      ? [...new Set([...state.visited, event.app])]
      : state.visited;
  const facts = catalog.filter((f) => visited.includes(f.app));
  const returned =
    state.returned ||
    (event.action === "OPEN" &&
      event.app === "email" &&
      state.visited.some((a) => a !== "email"));
  return {
    currentApp: event.app,
    visited,
    facts,
    ...contextFromFacts(facts),
    intent:
      facts.length === state.facts.length ? state.intent : inferIntent(facts),
    events: [...state.events, event].slice(-100),
    returned,
    boundary:
      event.action === "REPLY"
        ? returned
        : event.action === "OPEN"
          ? false
          : state.boundary,
  };
}
