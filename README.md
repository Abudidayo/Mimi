
<img width="1300" height="688" alt="mimi-ballon" src="https://github.com/user-attachments/assets/5cce7c95-c65d-4872-8bb0-7c044e202fcd" />

---

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Mastra](https://img.shields.io/badge/Mastra-Agent%20Orchestration-111827?logo=mastra)](https://mastra.ai/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-6-000000?logo=vercel)](https://sdk.vercel.ai/)
[![Stagehand](https://img.shields.io/badge/Stagehand-Browser%20Automation-2563eb)](https://stagehand.dev/)
[![Convex](https://img.shields.io/badge/Convex-Persistence-f59e0b)](https://www.convex.dev/)
[![Mapbox](https://img.shields.io/badge/Mapbox-3D%20Maps-22c55e?logo=mapbox)](https://www.mapbox.com/)
[![Civic](https://img.shields.io/badge/Civic-Auth%20%26%20Identity-7c3aed)](https://www.civic.com/)
[![Luffa](https://img.shields.io/badge/Luffa-Voice%20Bridge-f97316)](#voice-and-realtime)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

An agentic travel planner built for the AI Agents track.

Mimi is based on a simple belief: the goal of autonomy is not to remove the user, but to remove the work. For consumer tasks like travel planning, fully eliminating the human is often the wrong experience because preferences, tradeoffs, and approvals are personal. Instead, Mimi combines multi-agent orchestration with generative UI to create a low-friction approval loop.

Specialist agents independently research destinations, transport, lodging, safety, packing, events, and itineraries. Then structured UI surfaces the right controls, cards, and trip artifacts at the right time so the user can guide the workflow without repeatedly restating everything in text.

In the spirit of Steve Jobs' idea that good design starts with the customer experience and then works backward to the technology, Mimi is designed around decision clarity first and AI complexity second.

## Why this matters

Most AI travel tools still rely too heavily on chat. That creates three problems:

- users have to keep rewriting preferences in text
- the agent wastes tokens clarifying simple choices
- approval becomes slow and high-friction

Mimi solves that with:

- multi-agent orchestration for the heavy lifting
- inline generative UI for quick edits and approvals
- planner artifacts for seeing the whole trip in one place
- browser-use execution for live reservation attempts

The user stays in the loop only where human judgment matters. The agents handle the rest.

## What Mimi does

- Suggests destinations and cities when the user starts broadly
- Collects missing trip constraints with inline controls instead of long back-and-forth chat
- Orchestrates specialist agents for:
  - transportation
  - lodging
  - safety
  - packing
  - discovery and events
  - itinerary planning
- Builds a structured trip artifact in a planner drawer
- Lets users edit plans through low-friction UI instead of retyping prompts
- Attempts live browser-backed reservation workflows and stops before checkout
- Streams browser activity so users can watch the agent work
- Persists chat sessions and restores active conversations across refreshes
- Supports voice and realtime interaction flows through the Luffa bridge work
- Uses authenticated user context through Civic-based identity components

## Core product idea

Mimi is not "chat-first AI."

It is:

- agent-first orchestration
- UI-assisted decision making
- low-friction human approval

Generative UI is not cosmetic here. It is how the app reduces the cost of human approval. Instead of asking users to repeatedly describe or restate preferences in plain text, the agent renders the right controls and artifacts for the decision at hand.

That means the system can:

- collect missing constraints
- present tradeoffs visually
- let users edit intent directly
- confirm agent decisions with minimal effort
- move from conversation to action faster

## Architecture

### Orchestration

Mimi uses a supervisor-driven multi-agent setup built with Mastra.

Specialist agents handle different parts of the workflow, including:

- suggestions
- transport
- lodging
- safety
- weather
- packing
- events and discovery
- itinerary planning
- booking

The supervisor decides which specialists to invoke, gathers missing trip information, and composes the results into a coherent plan.
Before itinerary generation, transport and lodging are treated as hard prerequisites so the planner does not build day plans against missing reservation context.

### Generative UI

Mimi uses two forms of generative UI:

- inline controls inside assistant responses
- richer rendered components like destination cards, transport cards, stay cards, planner views, and booking progress

This reduces text dependence, lowers token usage, and makes approvals feel much more natural.

### Browser use

For high-agency demos, Mimi can run browser automation through Stagehand.

That enables the app to:

- open travel providers
- fill trip details
- navigate booking flows
- show live browser progress
- stop on user request
- halt before final checkout/payment

### Guardrails and approval design

Mimi is intentionally not a fully unsupervised purchasing agent. It uses a low-friction approval model:

- inline controls instead of repeated text clarification
- hidden action prompts so the UI stays clean while the agent receives structured instructions
- specialist boundaries so the supervisor delegates instead of fabricating specialist outputs
- itinerary gating so trip planning waits for transport and stay context
- browser automation that stops before payment or final checkout
- explicit stop controls for live browser sessions

This keeps the system more trustworthy while still feeling highly autonomous.

### Security and identity

The project includes a few practical security and identity layers:

- Civic auth integration for user identity and session-aware features
- Convex-backed persistence for saved chat sessions and trip state
- sanitized chat persistence so invalid streamed/tool payloads do not get rehydrated blindly
- structured tool and UI schemas with Zod
- conservative browser automation boundaries to avoid accidental checkout completion

### Voice and realtime

The app also includes voice/realtime-oriented work:

- Luffa bridge scripts for voice assistant integration and experimentation
- voice overlay support in the chat interface
- merged voice workflow hooks for hands-free interaction patterns

## Features

- Inline generative controls for destination, nationality, dates, travellers, budget, and stay type
- Multi-agent orchestration for end-to-end trip planning
- Interactive transport and lodging selection
- Trip planner drawer with map, timeline, transport, stay, and itinerary sections
- Browser-use timeline with readable step logs
- Stop control for active browser runs
- Persisted chat sessions
- Voice overlay support from the merged voice work
- Hidden action-prompt transport so UI labels stay clean while richer prompts are sent to the agent
- Localized UI defaults such as UK origin/currency handling

## Tech stack

- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion
- Radix UI
- Mastra
- Vercel AI SDK
- Zod
- Convex
- Mapbox GL
- Stagehand
- Civic Auth
- Luffa bridge scripts

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Environment

Create a `.env.local` and add the keys you want to use.

Typical app/runtime keys:

```bash
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=
NEXT_PUBLIC_CIVIC_CLIENT_ID=
```

Optional browser execution keys:

```bash
BB_API_KEY=
BB_PROJECT_ID=
STAGEHAND_ENV=LOCAL
STAGEHAND_MODEL=openai/gpt-4o-mini
STAGEHAND_AGENT_MODEL=openai/gpt-4o-mini
STAGEHAND_EXECUTION_MODEL=openai/gpt-4o-mini
```

Optional supporting services:

```bash
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
BB_API_KEY=
BB_PROJECT_ID=
```

Notes:

- `STAGEHAND_ENV=LOCAL` lets you watch the agent use your local browser
- Browserbase mode uses remote sessions instead
- Mapbox is required for the planner map
- Civic client configuration is required for auth-enabled flows
- Luffa bridge scripts are optional unless you are using the voice/bot workflow

### Run the app

```bash
npm run dev
```

Then open:

```bash
http://localhost:3000
```

## Demo framing

The strongest way to think about Mimi is:

> True autonomy in consumer software does not mean excluding the user. It means the system independently does the heavy lifting, makes informed decisions, and only involves the user at the points where judgment, taste, or consent actually matter.

That is exactly what Mimi is built for.

## Project status

Current strengths:

- real multi-agent orchestration
- structured UI-driven approvals
- browser-backed execution path
- live booking progress visibility
- editable trip artifacts
- auth, persistence, and voice hooks already integrated into the product shell

Current focus areas:

- making supervisor routing more consistently parallel
- polishing the trip planner drawer and map experience
- strengthening browser happy paths and recovery behavior

## Contributors

- Johnmiicheal
- Jessica Mak
- Abdullah Shamam

## Hackathon highlights

- Multi-agent travel orchestration with Mastra
- Generative UI for low-friction human approval
- Browser automation with visible execution steps
- Planner artifact with structured trip context instead of text-only chat
- Civic-backed identity hooks and Convex-backed memory
- Voice/realtime bridge experimentation through Luffa

## Acknowledgments

- [Mastra](https://mastra.ai)
- [Stagehand](https://stagehand.dev)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Mapbox](https://www.mapbox.com)
- [Radix UI](https://www.radix-ui.com)
- [Civic](https://www.civic.com)
- [Convex](https://www.convex.dev)

## License

MIT
