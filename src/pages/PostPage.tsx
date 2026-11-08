import { Link } from "@tanstack/react-router";
import { formatDate } from "../components/Blogs.tsx";
import { Markdown } from "../components/Markdown.tsx";
import { Nav } from "../components/Nav.tsx";
import { content, type Post } from "../content/index.ts";

export function PostPage({ post }: { post: Post }) {
  const i = content.posts.findIndex((p) => p.slug === post.slug);
  const newer = content.posts[i - 1];
  const older = content.posts[i + 1];
  return (
    <div className="mx-auto flex max-w-[1216px] flex-col gap-16 px-4 pt-6 pb-16 sm:px-8">
      <Nav />
      <main id="main" className="grid gap-10 md:grid-cols-[1fr_2fr]">
        <aside className="flex flex-col gap-3 text-[11px] uppercase text-muted md:sticky md:top-6 md:self-start">
          <Link to="/blog" className="no-underline hover:text-ink">
            ← All posts
          </Link>
          <span>{formatDate(post.date)}</span>
          <span className="normal-case">{post.summary}</span>
        </aside>
        <article className="max-w-[68ch] text-[14px] leading-[1.7]">
          <h1
            style={{ viewTransitionName: `post-${post.slug}` }}
            className="mt-0 mb-10 font-display text-[clamp(44px,6vw,72px)] uppercase leading-[0.9] tracking-[-0.02em]"
          >
            {post.title}
          </h1>
          <div className="animate-rise [animation-delay:120ms]">
            <Markdown tree={post.body} />
          </div>
          <nav className="mt-16 grid grid-cols-2 gap-3.5 border-ink border-t pt-6 text-[12px] uppercase">
            {newer ? (
              <Link
                to="/blog/$slug"
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
                to="/blog/$slug"
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
