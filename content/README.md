# Editing the site

Everything you can read on the site comes from this folder. Change a file, save,
and the dev server reloads. A typo in a field name or a missing value fails the
build with the file name and the field, so you can't publish a broken page.

Values in `[square brackets]` are placeholders still to fill in.

## `site.json` — the page itself

| Field | Where it shows |
| --- | --- |
| `name.first`, `name.last` | The big name, nav, page titles, boot screen |
| `role`, `location` | Nav ("Software Engineer / Sydney"), boot screen |
| `coordinates` | Boot screen |
| `tags` | The outlined chips under your name |
| `seo.title`, `seo.description` | Browser tab, search results, link previews |
| `contact.headline` | "Let's build something." |
| `contact.email`, `contact.github`, `contact.linkedin` | Contact band, ⌘K palette, ⌥2 / ⌥4 |
| `contact.coffee.subject`, `.body` | The email drafted by "Book a coffee" (⌥5) |
| `github.user` | The Activity graph |
| `sections.*.title`, `.caption` | Section headings and the small text beside them |

## Markdown files

Each is a `---` block of fields, then optional body text.

| Folder / file | One file per | Body text becomes |
| --- | --- | --- |
| `companies/` | Role in the Companies list. Fields: `slug`, `name`, `role`, `start`, `end`, `highlight`, `url`, `stack`, optional `detail`. | The bullet points in its popover |
| `projects/` | Project card. Fields: `slug`, `code`, `name`, `status`, `pitch`, `tags`, `links`, optional `featured`. | The description in its popover |
| `interests/` | Brain region. Fields: `slug`, `num`, `name`, `region`, `function`, `blurb`, `facts`. The seven slugs must stay `bouldering`, `djing`, `gaming`, `dogs`, `tech`, `streetwear`, `pokemon` (each is a region of the 3D brain). | — |
| `logs/` | Log entry at `/logs/<slug>`. Fields: `slug`, `title`, `date` (YYYY-MM-DD), `summary`, `diagram` (an id from `src/diagrams/ids.ts`, required on every log), optional `project` (a project slug, which makes it a build log for that project) and `draft: true` to hide it. | The full post |

Files are listed in filename order, so the `01-`, `02-` prefixes set the order of
companies, projects and interests. Logs sort by `date`, newest first.

### Adding things

- **A role**: copy a file in `companies/`, rename it with the next number, edit.
- **A project**: same in `projects/`. With only one project the card goes full width.
- **A log**: add `logs/YYYY-MM-DD-some-slug.md`. Add `project: redacted` to file it
  under the [REDACTED] build log.

The LinkedIn banner (`src/banner`) renders `site.json`. `pnpm deploy` regenerates `design/linkedin-banner.png`, and `pnpm test` fails if it falls behind. LinkedIn has no upload API, so re-upload the PNG by hand when it changes.

The guided tour lives in `tour.json`, with the recording in `tour-narration.mp3` and its timings in `tour-timing.json`. After re-recording or rewording a stop, run `pnpm tour:audio`; `pnpm test` fails if the script and the recording disagree.
