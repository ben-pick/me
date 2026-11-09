---
slug: how-this-site-is-built
title: How this site is built
date: 2026-11-08
summary: Content checked at build time, one drawing trick, and 3D that loads when you reach it.
diagram: site
---

This site runs on the same stack as [REDACTED]: TanStack Start with React 19 on Cloudflare Workers, Tailwind v4, Biome and Vitest. Three decisions shaped the rest of it.

The build checks the content. Every word lives in Markdown or JSON. A small Vite plugin parses those files in Node, validates their frontmatter with Effect Schema, and exposes the result as a virtual module. A typo in a field stops the build and names the file, and a log without a diagram fails the same way. The Markdown parser stays on the build machine, so visitors never download it.

Every graphic uses one trick. The company scenes and brain callouts start as ordinary canvas drawings, white on black and off-screen. Sampling that canvas on a grid turns each cell into a square dot sized by its brightness. Gengar, beside my name, went through the same process from a picture. With one function that turns anything into dots, new artwork costs a drawing and arrives matching the rest of the site.

Heavy code waits until you need it. The brain, the diagrams and the logo animation use three.js, the largest file here. A dynamic import fetches it when a scene nears the viewport, and scenes stop drawing off-screen. With reduced motion or no WebGL, the brain falls back to a still frame that responds to clicks and keys, and the diagrams keep their controls.

Everything clickable has its own URL. Every row, card and brain region opens a popover at an address like `#company/kodo`, and `⌘K` searches them all.

The diagram above plays these out. Press Page load and watch three.js arrive last.
