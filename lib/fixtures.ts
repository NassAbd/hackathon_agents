export const apps = ["email", "slack", "github", "crm"] as const;
export type AppId = (typeof apps)[number];
export const appNames: Record<AppId, string> = {
  email: "Email",
  slack: "Slack",
  github: "GitHub",
  crm: "CRM",
};
export type Fact = {
  id: string;
  text: string;
  app: AppId;
  source: string;
  customerSafe: boolean;
};
export const facts: Fact[] = [
  {
    id: "concern",
    text: "Sarah at ACME reports recurring payment failures ahead of renewal.",
    app: "email",
    source: "Sarah Chen · Payment failures",
    customerSafe: true,
  },
  {
    id: "eu",
    text: "Payment failures affect the EU region only.",
    app: "slack",
    source: "#inc-payments · Maya Patel, 14:08",
    customerSafe: true,
  },
  {
    id: "deploy",
    text: "Failures began after the latest deployment.",
    app: "slack",
    source: "#inc-payments · Leo Martin, 14:11",
    customerSafe: true,
  },
  {
    id: "cause",
    text: "The root cause was a routing configuration error.",
    app: "github",
    source: "Issue #4821 · Root cause",
    customerSafe: true,
  },
  {
    id: "fix",
    text: "The fix was deployed at 14:32 UTC.",
    app: "github",
    source: "Issue #4821 · Resolution",
    customerSafe: true,
  },
  {
    id: "normal",
    text: "The payment error rate has returned to normal.",
    app: "github",
    source: "Issue #4821 · Verification",
    customerSafe: true,
  },
  {
    id: "arr",
    text: "ACME annual recurring revenue is €120,000.",
    app: "crm",
    source: "ACME · Account overview",
    customerSafe: false,
  },
  {
    id: "renewal",
    text: "ACME renews in 19 days.",
    app: "crm",
    source: "ACME · Renewal",
    customerSafe: true,
  },
  {
    id: "risk",
    text: "ACME account health is at risk.",
    app: "crm",
    source: "ACME · Account health",
    customerSafe: false,
  },
];
export const pages: Record<
  AppId,
  {
    title: string;
    url: string;
    content: string;
    customerSafeContent?: string[];
  }
> = {
  email: {
    title: "Payment failures ahead of our renewal",
    url: "mail.workspace.local/inbox/acme",
    content:
      "From Sarah Chen, Head of Operations at ACME. Hi Alex, We’ve been experiencing payment failures again this week. This is becoming a serious concern ahead of our renewal. Can you tell me what’s happening and what you’re doing about it? Sarah",
  },
  slack: {
    title: "#inc-payments",
    url: "slack.workspace.local/channels/inc-payments",
    content:
      "Maya Patel 14:08: ACME is reporting payment failures. Confirmed: failures affect the EU region only. Leo Martin 14:11: Started after the latest deployment. Tracking the investigation in GitHub issue #4821.",
  },
  github: {
    title: "EU payment timeouts #4821",
    url: "github.workspace.local/platform/payments/issues/4821",
    content:
      "Issue #4821: EU payment timeouts. ACME is an affected customer. Closed. Root cause: a routing configuration error introduced in the latest deployment. Fix deployed at 14:32 UTC. Verification: payment error rate has returned to normal.",
  },
  crm: {
    // CRM is internal by default. Only this customer-facing field can enter a reply.
    customerSafeContent: ["Renewal in 19 days."],
    title: "ACME · Account overview",
    url: "crm.workspace.local/accounts/acme",
    content:
      "ACME. Contact: Sarah Chen, Head of Operations. Owner: Alex Morgan. Annual recurring revenue: €120,000. Renewal in 19 days. Account health: at risk. Customer flagged recurring payment failures ahead of renewal.",
  },
};
