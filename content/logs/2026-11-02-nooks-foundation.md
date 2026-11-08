---
slug: nooks-foundation
title: The foundation
date: 2026-11-02
summary: Monorepo, Effect v4 everywhere, TanStack Start on Workers, an MCP server and CI with gated infra deploys.
project: nooks
---

Before building any product, I set up the foundation it would sit on:

- A **pnpm + Turborepo** monorepo split into products and tiered packages, with the dependency direction enforced by lint.
- **Effect v4** as the programming model, with Schema at every boundary and unsafe parsing banned by lint rules.
- **TanStack Start** on **Cloudflare Workers** for the web layer, a schema-first HTTP API kind, and a remote **MCP server** capability.
- A model layer with swappable providers and a scripted mock for tests.
- Generators that scaffold new products and packages from templates.
- **GitHub Actions** CI, with **Pulumi** infrastructure deploys gated per stack and a dependency graph posted on every pull request.

It also has an agent knowledge system: rules, skills and decision records that coding agents read before touching the code.
