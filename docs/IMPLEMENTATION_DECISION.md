# Implementation decision

Choose B: one minimal Next.js application. The repository began with instructions and product documents, without app code. No local Agents Everywhere starter was found under the development directory. Reviewed its official AGENTS.md, overview, rules, sponsor guidance and Web README remotely.

The Web template focuses on prompted CopilotKit chat, approvals and persistent Ambiguous records. GHOST needs navigation-driven events, an evolving graph and an in-memory email draft. Removing that template's infrastructure costs more than a small implementation. No starter source is copied.

Use React state, React Flow with fixed node positions, Zod contracts, a single server-side OpenAI Agents SDK agent and deterministic fixtures/fallback. Plain CSS keeps visual styling in one place without adding another build dependency. No CopilotKit, database, auth or external application integrations.

Official reference: https://github.com/CopilotKit/agents-everywhere-starter-kit/blob/main/apps/web/README.md
