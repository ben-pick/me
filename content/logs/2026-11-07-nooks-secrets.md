---
slug: nooks-local-secrets
title: Secrets in every worktree
date: 2026-11-07
summary: Local secrets come from a vault, so a new worktree is ready to run.
project: nooks
---

Agents and people work in many worktrees at once, and copying `.dev.vars` around was getting fragile.

Now each worktree pulls its local secrets from the password vault on install. No secret values live in the repo; the config only says where each one comes from.
