# Benjamin Pick — portfolio

A single-page portfolio with a ⌘K command palette, a terminal, popovers for every
company, project and interest, and a WebGL point-cloud brain.

## Stack

Same as Nooks:

- **TanStack Start** (React 19, file routes, server routes) built with **Vite**
- **Cloudflare Workers** via `@cloudflare/vite-plugin`, deployed with `wrangler`
- **Tailwind v4**: theme tokens in `src/styles.css`, everything else inline
- **Radix** dialogs for popovers and the palette
- **Effect Schema** validates content at build time
- **three.js** for the brain, loaded lazily
- **Biome**, **Vitest**, **TypeScript 6** (strict), **pnpm**, **mise**

## Develop

```bash
mise install
pnpm install
pnpm dev
```

`pnpm check` runs typecheck, lint and tests. `pnpm deploy` builds and deploys.

## Content

Everything on the page comes from Markdown files with frontmatter in `content/`:

| Folder | Becomes |
| --- | --- |
| `content/companies/` | Index rows + company popovers (body bullets) |
| `content/projects/` | Project cards + popovers (`log`, `links`) |
| `content/interests/` | Brain regions + interest popovers |
| `content/posts/` | Blog posts at `/blog/<slug>` (latest three on the home page) |

`src/content/plugin.ts` parses them in Node at build time and validates the
frontmatter against `src/content/schema.ts`. A bad field fails the build with
the file name. Values in `[brackets]` are placeholders to fill in.

## Interaction map

| Input | Does |
| --- | --- |
| `⌘K` / `Ctrl+K`, or start typing | Command palette (fuzzy search) |
| `⌥1`–`⌥5` | Latest post, copy email, experience, GitHub, book a coffee |
| `⌘C` over the contact block | Copy email |
| `#company/thanks`, `#project/nooks`, `#interest/djing` | Deep-link a popover |
| Brain: drag, click, `←` `→` `↵` | Rotate with inertia, select, open |
| Terminal | `help`, `ls`, `cat now.txt`, `projects`, `open <name>`, `gh`, `neofetch`, `sudo hire ben`, `clear` / `⌃L`, tab-complete, `↑` history |

## Brain

`src/brain/points.ts` builds the procedural point cloud (from the approved
prototype) and draws labels; `src/brain/glyphs.ts` holds each region's animated
dot vignette (decks, climber, controller, dog); `src/brain/scene.ts` renders the
points into an offscreen target, then a film-grain pass. The scene loads when the
panel nears the viewport and pauses off-screen. With reduced motion or no WebGL,
a still 2D frame stays in place and still works by click and keyboard.

To use a real anatomical model, replace `buildBrain` with points sampled from
the mesh and keep the same `positions` / `regions` / `anchors` shape.

## GitHub activity

`/api/github` fetches public events for `GITHUB_USER` and caches them at the edge
for ten minutes. Set a `GITHUB_TOKEN` secret (`wrangler secret put GITHUB_TOKEN`)
for higher rate limits. The terminal's `gh` command reads it.

## Deploy

`.github/workflows/deploy.yml` uploads a preview version per PR and deploys
`main`. It needs a `CLOUDFLARE_API_TOKEN` secret and a `CLOUDFLARE_ACCOUNT_ID`
variable on the repository.

## Still to do

- License Helvetica Now Display (Inter Tight is the fallback).
- Fill the `[bracketed]` placeholders in `content/`.
- Hero media for project popovers; a DJ mix embed.
- OG image (`public/og.png`) and analytics.
