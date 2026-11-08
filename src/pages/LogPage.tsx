import { Link } from "@tanstack/react-router";
import { DiagramPanel } from "../components/DiagramPanel.tsx";
import { formatDate } from "../components/Logs.tsx";
import { Markdown } from "../components/Markdown.tsx";
import { Nav } from "../components/Nav.tsx";
import { Brackets } from "../components/ui.tsx";
import { content, type Log, projectBySlug } from "../content/index.ts";
import { actions, anchorFrom } from "../lib/store.ts";

export function LogPage({ log: post }: { log: Log }) {
  const project = post.project ? projectBySlug(post.project) : undefined;
  const i = content.logs.findIndex((p) => p.slug === post.slug);
  const newer = content.logs[i - 1];
  const older = content.logs[i + 1];
  return (
    <div className="mx-auto flex max-w-[1216px] flex-col gap-16 px-4 pt-6 pb-16 sm:px-8">
      <Nav />
      <main id="main" className="grid gap-10 md:grid-cols-[1fr_2fr]">
        <aside className="flex flex-col gap-3 text-[11px] uppercase text-muted md:sticky md:top-6 md:self-start">
          <Link to="/logs" className="no-underline hover:text-ink">
            ← All logs
          </Link>
          <span>{formatDate(post.date)}</span>
          <span className="normal-case">{post.summary}</span>
          {project ? (
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={(e) =>
                actions.openPopover(
                  { kind: "project", slug: project.slug },
                  {
                    anchor: anchorFrom(e.currentTarget, e),
                    trigger: e.currentTarget,
                  },
                )
              }
              className="group relative mt-2 flex min-h-11 items-center justify-between gap-3 self-start border-0 bg-transparent px-4 font-mono text-[11px] uppercase text-ink"
            >
              <Brackets />
              {project.name} build log
              <span className="transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                ↗
              </span>
            </button>
          ) : null}
        </aside>
        <article className="min-w-0 text-[14px] leading-[1.7]">
          <h1
            style={{ viewTransitionName: `post-${post.slug}` }}
            className="mt-0 mb-10 max-w-[68ch] font-display text-[clamp(44px,6vw,72px)] uppercase leading-[0.9] tracking-[-0.02em]"
          >
            {post.title}
          </h1>
          <DiagramPanel key={post.slug} id={post.diagram} />
          <div className="max-w-[68ch] animate-rise [animation-delay:120ms]">
            <Markdown tree={post.body} />
          </div>
          <nav className="mt-16 grid max-w-[68ch] grid-cols-2 gap-3.5 border-ink border-t pt-6 text-[12px] uppercase">
            {newer ? (
              <Link
                to="/logs/$slug"
                params={{ slug: newer.slug }}
                className="no-underline hover:underline"
              >
                ← {newer.title}
              </Link>
            ) : (
              <span />
            )}
            {older ? (
              <Link
                to="/logs/$slug"
                params={{ slug: older.slug }}
                className="text-right no-underline hover:underline"
              >
                {older.title} →
              </Link>
            ) : null}
          </nav>
        </article>
      </main>
    </div>
  );
}
