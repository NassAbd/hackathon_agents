# GHOST

## Tagline

**The agent that lives between your apps.**

Every app understands what happens inside it.
GHOST understands why you move between them.

## Description

GHOST is an ambient agent that understands your intent from the way you move
through your work.

Instead of asking users to stop what they are doing, open a chatbot, and
reconstruct their context, GHOST observes the context they encounter across
their workflow.

As the user moves between Email, Slack, GitHub and CRM, GHOST extracts
grounded entities, facts and relationships, preserves their provenance, and
builds a live visual graph of the task taking shape.

Its inferred intent evolves as more context becomes available.

When the user returns to the original email to reply, GHOST recognizes that
the investigation has reached an action point. It restores the relevant
cross-app context and generates a grounded response.

No prompt is required.

**The prompt isn't what you type. The prompt is what you do.**

## Why this fits "Agents, Everywhere"

Most AI assistants understand what happens inside one conversation.

GHOST explores a different interaction pattern: an agent whose environment
is the user's workflow itself.

The order in which the user visits applications, the entities that persist
between them, and the information encountered along the way become meaningful
signals for the agent.

This context cannot be reproduced by a standalone chatbot without asking the
user to manually explain what they are doing.

GHOST turns work itself into the prompt.

## Demo scenario

A customer, ACME, reports recurring payment failures and raises concerns ahead
of an upcoming renewal.

The user investigates naturally:

Email
→ Slack
→ GitHub
→ CRM
→ Email

While this happens, GHOST progressively builds a live context graph and
infers the user's intent.

By the time the user returns to Email, GHOST understands the incident,
its resolution, the customer context and the purpose of the investigation.

Clicking Reply restores the relevant context.

Clicking Draft Reply generates a grounded customer response using the facts
GHOST encountered during the workflow.

## What makes GHOST different

GHOST does not primarily respond to messages.

It responds to a trajectory.

Rather than treating each application as an isolated context window, GHOST
tracks the entities and relationships that survive transitions between
applications.

**Every app understands what happens inside it.
GHOST understands why you move between them.**

## Built during the hackathon

The project and its core functionality were built during the official
Agents, Everywhere hackathon period.

Built during the event:

- GHOST interaction model
- workflow event system
- live context graph
- entity/fact/relationship extraction
- intent inference
- confidence representation
- source provenance
- contextual restoration
- grounded reply generation
- deterministic demo fallback
- browser workspace prototype
- [real browser extension, if completed]

Existing third-party libraries and official hackathon resources were used
only as building blocks.

## Technology

- Next.js
- React
- TypeScript
- OpenAI Agents SDK
- Zod
- React Flow
- [Chrome Extension APIs, if completed]

## Repository

<GitHub URL>

## Demo

<Video URL>

## Team

Solo build by <name>