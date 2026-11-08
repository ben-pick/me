---
slug: how-this-site-is-built
title: How this site is built
date: 2026-11-08
summary: TanStack Start on Cloudflare Workers, content as Markdown, and a point-cloud brain.
---

This site runs on the same stack as Nooks: **TanStack Start** with React 19, deployed to **Cloudflare Workers** through the Cloudflare Vite plugin, styled with **Tailwind v4**, linted with **Biome** and tested with **Vitest**.

## Content as files

Companies, projects, interests and posts are Markdown files with frontmatter. A small Vite plugin parses them at build time, validates them with Effect Schema, and exposes them as a virtual module — so no Markdown parser ships to the browser.

## Interaction

- Every row, card and brain region opens a popover with its own deep link, like `#company/thanks`.
- `⌘K` opens a fuzzy command palette; typing anywhere does too.
- The terminal takes `help`, `ls`, `projects`, `neofetch` and a few others.

## The brain

The brain is a WebGL point cloud rendered by three.js into an offscreen target, then passed through a film-grain shader. It only loads once it scrolls into view, and falls back to a still frame when motion is reduced or WebGL is missing.
