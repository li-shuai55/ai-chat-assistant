# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is an early-stage AI chat application bootstrapped with Next.js App Router. It currently implements a single-room streaming chat UI backed by the Vercel AI SDK. Many planned modules (Zustand store, Prisma schema, chat components, RAG, session management) exist only as empty stubs.

## Important caveat about Next.js

This repo uses **Next.js 16.2.12** and **React 19**. The installed version has breaking changes compared to older Next.js releases. Before writing Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`, especially deprecation notices. Do not assume APIs from training data work unchanged.

## Tech stack

- **Framework / runtime:** Next.js 16.2.12 App Router, React 19.2.4
- **Language:** TypeScript 5 with strict mode
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **AI SDK:** `@ai-sdk/react` v4 + `ai` v7
- **State / data (planned, mostly empty):** Zustand, TanStack React Query, Prisma + PostgreSQL

## Common commands

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start the production server (after building)
npm run start

# Run ESLint
npm run lint

# Run TypeScript type check
npx tsc --noEmit
```

There is no test runner configured yet, so there is no command for running tests.

## Project structure and conventions

### Path aliases

`tsconfig.json` maps `@/*` to `./*`. The current code uses `@/src/lib/ai` to reach `src/lib/ai.ts`, which resolves correctly because the alias points at the repository root.

### Styling (Tailwind v4)

Tailwind CSS v4 is configured via `postcss.config.mjs` using `@tailwindcss/postcss`. Theme tokens are defined in `src/app/globals.css` with the v4 syntax (`@import "tailwindcss"` and `@theme inline`), not a separate `tailwind.config.ts`.

### App Router layout

- `src/app/layout.tsx` — root layout with Geist fonts and full-height flex body.
- `src/app/page.tsx` — chat page (client component) using `@ai-sdk/react`.
- `src/app/api/chat/router.ts` — API route handler that streams responses.

### AI SDK integration

This is the most important architectural detail: the project uses **AI SDK v4/v7**, whose APIs differ significantly from earlier versions.

- Client side: `useChat` no longer takes an `api` string. It requires a `transport` (e.g., `new DefaultChatTransport({ api: '/api/chat' })` from `ai`). It returns `sendMessage`, `status`, `messages`, `stop`, `error`, etc. Input state must be managed manually with `useState`. Messages use `message.parts` instead of `message.content`.
- Server side: `streamText` returns a result. The current code uses `result.toUIMessageStreamResponse()`, which matches `DefaultChatTransport` on the client. This method is deprecated in `ai` v7 but still functional.

Provider setup lives in `src/lib/ai.ts`. The active provider is **Aliyun Bailian (DashScope)** via `createOpenAI` with `baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'`. Commented-out OpenAI configuration is also present.

### Empty stubs (not yet implemented)

The following files/directories exist but are empty or unused. They are placeholders for upcoming features:

- `src/components/chat/*.tsx`
- `src/stores/chatStore.ts`
- `src/types/chat.ts`
- `src/lib/utils.ts`
- `prisma/`

### Environment variables

Required / configured in `.env.local`:

- `BAILIAN_API_KEY` — active provider key for Aliyun DashScope
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY` — alternative providers
- `DATABASE_URL` — PostgreSQL connection string (reserved for future Prisma use)
- `OPENAI_EMBEDDING_DIMENSION` — vector dimension placeholder for future RAG

## Linting

ESLint is configured in `eslint.config.mjs` using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` with the new flat-config `defineConfig` API.

## README reference

The README lists planned features: multi-turn chat, streaming output, session management, RAG knowledge base, and Agent / Tool Use. Only project initialization and basic streaming chat are currently implemented.
