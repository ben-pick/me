# Benjamin Pick — portfolio

A single-page portfolio with a ⌘K command palette, popovers for every
company, project and interest, a GitHub contribution graph and a WebGL point-cloud brain.

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
`pnpm build:artifact` builds a static, client-only copy into `dist-artifact/`
(in-memory routing, relative paths) for hosting as a claude.ai artifact.

## Content

Everything on the page comes from `content/`: `site.json` for the page copy, and
Markdown files with frontmatter for everything else. See
[`content/README.md`](content/README.md) for every field.

| Folder | Becomes |
| --- | --- |
| `content/companies/` | Index rows + company popovers (body bullets) |
| `content/projects/` | Project cards + popovers (`links`) |
| `content/interests/` | Brain regions + interest popovers |
| `content/logs/` | Logs at `/logs/<slug>` (latest three on the home page). Add `project: <slug>` to make one a build log: it then appears in that project's card and popover. |

`src/content/plugin.ts` parses them in Node at build time and validates the
frontmatter against `src/content/schema.ts`. A bad field fails the build with
the file name. Values in `[brackets]` are placeholders to fill in.

## Interaction map

| Input | Does |
| --- | --- |
| `⌘K` / `Ctrl+K`, or start typing | Command palette (fuzzy search) |
| `⌥1`–`⌥5` | Latest log, copy email, experience, GitHub, book a coffee |
| `⌘C` over the contact block | Copy email |
| `#company/thanks`, `#project/nooks`, `#interest/djing` | Deep-link a popover |
| Brain: drag, click, `←` `→` `↵` | Rotate with inertia, select, open |

## Motion

- **Boot**: first visit per session plays a short terminal boot, then wipes away; the
  name drops in letter by letter and the brain's dots fly in. Skipped on repeat
  visits and with reduced motion (an inline script in the root decides before paint).
- **Company previews**: each row has an animated preview that trails the cursor. Scenes
  are shaded vector drawings (`src/brain/company-glyphs.ts`) rendered off-screen and
  converted to the brain's square-dot halftone, with dot size following brightness.
- **Scroll reveals**: section headings scramble into place and their rules draw across.

## Now playing

`content/now-playing.md` sets the song. A Spotify track link in `url:` plays through
Spotify's embedded player (it opens under the hero on first play); an audio file in
`public/` set as `audio:` takes precedence and drives the meter from the real signal.
The static artifact build can't embed Spotify, so there the button opens the track. Playing it pulses the brain's DJing
region.

## Brain

`src/brain/points.ts` builds the procedural point cloud (from the approved
prototype) and draws labels; `src/brain/glyphs.ts` holds each region's animated
dot vignette (decks, climber, controller, dog, code editor); `src/brain/scene.ts` renders the
points into an offscreen target, then a film-grain pass. The scene loads when the
panel nears the viewport and pauses off-screen. With reduced motion or no WebGL,
a still 2D frame stays in place and still works by click and keyboard.

To use a real anatomical model, replace `buildBrain` with points sampled from
the mesh and keep the same `positions` / `regions` / `anchors` shape.

## GitHub contributions

`/api/contributions` returns the last year of contributions for `github.user` in `content/site.json`, cached
at the edge for six hours. With a `GITHUB_TOKEN` secret it uses GitHub's GraphQL API;
without one it reads the public calendar at `github.com/users/<user>/contributions`.
The Activity section draws it as a halftone grid. The static artifact build has no
server, so there it shows the empty grid.


## Deploy

`.github/workflows/deploy.yml` uploads a preview version per PR and deploys
`main`. It needs a `CLOUDFLARE_API_TOKEN` secret and a `CLOUDFLARE_ACCOUNT_ID`
variable on the repository.

## Still to do

- License Helvetica Now Display (Inter Tight is the fallback).
- Fill the `[bracketed]` placeholders in `content/`.
- Hero media for project popovers; a DJ mix embed.
- OG image (`public/og.png`) and analytics.
