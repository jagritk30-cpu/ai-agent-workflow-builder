# AI Agent Workflow Builder

A full-stack workflow automation platform (a mini n8n) built for chaining AI agent steps. 

## Features
- **Multi-Tenant:** Organizations with isolated quotas and members.
- **Strict Role-Based Access (RLS):** Layer 1 (Org + Role scoping via Hasura RLS) and Layer 2 (Action Handler and Column-level permissions) ensure absolute security.
- **Workflow Engine:** Run LLMs, HTTP Requests, DB writes, and Conditional Branches sequentially.
- **Approval Gates:** Pause workflows mid-execution, requiring owner/editor authorization to resume.
- **Real-time Subscriptions:** Watch your workflows execute step-by-step via GraphQL subscriptions.

## Tech Stack
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Apollo Client
- **Backend:** Nhost (PostgreSQL, Auth, Hasura GraphQL Engine)
- **AI Model:** Gemini 1.5 Flash (via `@google/genai`)

## Evaluation Notes for Reviewers

### 1. Cross-Org Isolation & Security
- **Layer 1:** Hasura Metadata `_exists` relationships tightly bind all queries to the caller's `org_id` via `org_members`. Even if an attacker guesses a Workflow UUID from another org, Hasura simply returns `null` because the Row-Level Security blocks the read.
- **Layer 2 (DB Level):** In `nhost/metadata`, the `editor` role `insert` and `update` permissions on `workflow_steps` explicitly exclude (`_nin`) `db_write` and `notify` step types.
- **Layer 2 (Execution Level):** When a workflow pauses at an `approval_gate`, the GraphQL mutation `approveStep` routes to a Next.js Serverless Function (`/api/actions/approve-step`) which verifies the caller's role *before* allowing the engine to resume execution.

### 2. Automatic Nhost Deployment
All database schema files, Hasura metadata, and permissions are stored in the `nhost/` folder.
If this repository is linked to an Nhost project, pushing to the main branch automatically applies all migrations and metadata server-side without needing the Hasura CLI!

## How to Run Locally

If you wish to run the Next.js frontend locally against a live Nhost backend:

### 1. Environment Variables
Create a `.env.local` file in the root of the project:

```env
NEXT_PUBLIC_NHOST_SUBDOMAIN=your_nhost_subdomain
NEXT_PUBLIC_NHOST_REGION=your_nhost_region
GEMINI_API_KEY=your_gemini_api_key
HASURA_GRAPHQL_ADMIN_SECRET=your_admin_secret
```
*(Note: For the live Vercel deployment, these are securely stored in the Vercel dashboard and the Hasura Action Base URL is pointed to Vercel).*

### 2. Start the App
```bash
npm install
npm run dev
```

Open `http://localhost:3000` to access the application.
