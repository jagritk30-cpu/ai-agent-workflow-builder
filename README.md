# AI Agent Workflow Builder

> A production-grade mini n8n for chaining AI agent steps — built with nhost (Hasura + PostgreSQL + Auth), Next.js 14, and Google Gemini.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## 🚀 Live Demo

- **App**: [Your Vercel URL here]
- **GraphQL Explorer**: `https://YOUR_NHOST_SUBDOMAIN.hasura.YOUR_REGION.nhost.run/console`

### Demo Credentials
| Org | Email | Role |
|-----|-------|------|
| Org A | owner-a@demo.com | owner |
| Org A | editor-a@demo.com | editor |
| Org A | viewer-a@demo.com | viewer |
| Org B | owner-b@demo.com | owner |

---

## 📋 What It Does

Workflow automation platform where users:
- Build workflows from **6 step types**: `llm_call`, `http_request`, `db_write`, `notify`, `conditional_branch`, `approval_gate`
- Start them **4 ways**: Manual button, Webhook, Scheduled cron, Database event trigger
- Watch **live real-time execution** via GraphQL subscriptions
- Hit **approval gates** that pause the run until an owner/editor approves
- All governed by **two independent permission layers**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 14 (Vercel)                                    │
│  ├── App Router frontend (React + Apollo Client)        │
│  └── API Routes = Hasura Action handlers                │
│      ├── /api/actions/trigger-workflow-run              │
│      ├── /api/actions/approve-step                      │
│      ├── /api/actions/webhook-trigger                   │
│      ├── /api/actions/notify-handler (Event Trigger)    │
│      └── /api/actions/scheduled-runner (Cron Trigger)   │
└────────────────────┬────────────────────────────────────┘
                     │ GraphQL (HTTP + WebSocket)
┌────────────────────▼────────────────────────────────────┐
│  nhost Cloud                                            │
│  ├── Hasura GraphQL Engine                              │
│  │   ├── Row-level permissions (org + role scoped)      │
│  │   ├── Subscriptions (WebSocket)                      │
│  │   ├── Actions (→ Next.js API routes)                 │
│  │   └── Event/Cron Triggers                            │
│  ├── PostgreSQL (8 tables + aggregation view)           │
│  └── Auth (JWT with x-hasura-user-id claim)             │
└─────────────────────────────────────────────────────────┘
                     │ External calls
          ┌──────────┴──────────┐
          │ Google Gemini API   │ HTTP APIs (http_request steps)
          └─────────────────────┘
```

---

## ⚡ Local Setup

### Prerequisites
- Node.js 18+
- nhost account (free at [nhost.io](https://nhost.io))
- Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))
- Hasura CLI (`npm install -g hasura-cli`)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/ai-workflow-builder
cd ai-workflow-builder
npm install
```

### 2. Create nhost project

1. Go to [app.nhost.io](https://app.nhost.io) → New Project
2. Note your **subdomain** and **region**
3. After project starts, go to Settings → Hasura → copy **Admin Secret**

### 3. Apply Hasura schema

```bash
# Set your nhost Hasura endpoint and admin secret
export HASURA_GRAPHQL_ENDPOINT=https://YOUR_SUBDOMAIN.hasura.YOUR_REGION.nhost.run/v1/graphql
export HASURA_GRAPHQL_ADMIN_SECRET=your-admin-secret

# Apply migrations (creates all 8 tables + view)
cd hasura
hasura migrate apply --database-name default

# Apply metadata (permissions, actions, triggers)
hasura metadata apply

# Apply seed data (demo orgs + sample workflow)
hasura seed apply --database-name default
```

### 4. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_NHOST_SUBDOMAIN=your-subdomain
NEXT_PUBLIC_NHOST_REGION=eu-central-1
HASURA_GRAPHQL_ADMIN_SECRET=your-admin-secret
HASURA_GRAPHQL_ENDPOINT=https://your-subdomain.hasura.your-region.nhost.run/v1/graphql
GEMINI_API_KEY=your-gemini-api-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/... (optional)
WEBHOOK_SIGNING_SECRET=any-random-string
```

### 5. Configure Hasura Action handler URL

In Hasura Console → Settings → Actions:
- Set handler base URL to: `http://localhost:3000` (dev) or your Vercel URL (prod)

Or in metadata/actions.yaml, the `HASURA_ACTION_BASE_URL` env var is used.

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Set all environment variables in Vercel Dashboard → Settings → Environment Variables.

After deploy, update Hasura's Action handler URL to your Vercel URL:
- Hasura Console → Settings → Env Vars → set `HASURA_ACTION_BASE_URL=https://your-app.vercel.app`

---

## 🎬 Demo Scenario (Final Task)

To demonstrate the 6-point final task:

### 1. Setup (from seed data)
- **Org A**: owner-a@demo.com (owner), editor-a@demo.com (editor), viewer-a@demo.com (viewer)
- **Org B**: owner-b@demo.com (owner)

### 2. Build Org A workflow
Login as `owner-a@demo.com` → Workflows → Create → add:
1. **LLM Call** — "Analyze this task and say if it's valid: {{context.webhookPayload.task}}"
2. **HTTP Request** — GET https://httpbin.org/json (external API call)
3. **Conditional Branch** — `context.llmResponse contains valid`
4. **Approval Gate** — "Please review the analysis"
5. **DB Write** — Save results

### 3. Add webhook trigger
In the workflow builder's right panel → Add Webhook → copy the token.

### 4. Manual run
Click **Run Workflow** → watch live step-by-step progress in the run view.

### 5. Webhook run
```bash
curl -X POST https://your-app.vercel.app/api/actions/webhook-trigger \
  -H "Content-Type: application/json" \
  -d '{"workflow_id": "YOUR_WF_ID", "token": "YOUR_TOKEN", "payload": {"task": "Build a valid product"}}'
```

### 6. Approve
When run hits approval_gate → login as owner or editor → click Approve → run resumes.

### 7. Cross-org isolation test
Login as `owner-b@demo.com` → try to access Org A's workflow by URL/ID → **403 Forbidden / empty results**

---

## 📁 Project Structure

```
├── hasura/
│   ├── migrations/default/1699000000000_init/
│   │   └── up.sql          # All 8 tables + view
│   └── metadata/
│       ├── databases/default/tables/  # Per-table permissions YAML
│       ├── actions.yaml    # Hasura Action definitions
│       ├── cron_triggers.yaml
│       └── actions.graphql
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login, signup pages
│   │   ├── (app)/          # Dashboard, workflows, settings
│   │   └── api/actions/    # Hasura Action handlers
│   ├── lib/
│   │   ├── graphql-admin.ts  # Admin-secret GraphQL client
│   │   ├── workflow-executor.ts  # Core execution engine
│   │   ├── llm.ts          # Gemini API client
│   │   └── permissions.ts  # Role verification
│   ├── graphql/            # Queries, mutations, subscriptions
│   └── components/         # UI components
├── WRITEUP.md              # Design decisions write-up
└── .env.example
```

---

## 🔑 API Key Notes

- **Gemini API**: Free tier at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — no billing required. Limit: 15 RPM.
- If `GEMINI_API_KEY` is not set, the `llm_call` step returns a stubbed response with a 1.5s artificial delay (disclosed).
- **Slack**: `SLACK_WEBHOOK_URL` is optional. Without it, `notify` steps log to console.
