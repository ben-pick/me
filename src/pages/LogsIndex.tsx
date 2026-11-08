import { Link } from "@tanstack/react-router";
import { formatDate } from "../components/Logs.tsx";
import { Nav } from "../components/Nav.tsx";
import { SectionHeader } from "../components/ui.tsx";
import { content, site } from "../content/index.ts";

export function LogsIndex() {
  return (
    <div className="mx-auto flex max-w-[1216px] flex-col gap-16 px-4 pt-6 pb-16 sm:px-8">
      <Nav />
      <main id="main">
        <SectionHeader
          title={site.sections.logs.title}
          caption={`${content.logs.length} entries`}
        />
        <ul className="m-0 list-none border-ink border-t p-0">
          {content.logs.map((p, i) => (
            <li key={p.slug} className="border-ink border-b">
              <Link
                to="/logs/$slug"
                params={{ slug: p.slug }}
                className="group relative grid grid-cols-[40px_1fr] gap-4 overflow-hidden py-6 no-underline md:grid-cols-[50px_1fr_160px]"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 -right-4 -left-4 origin-bottom scale-y-0 bg-ink transition-transform duration-500 ease-out-expo group-hover:scale-y-100"
                />
                <span className="relative text-[12px] group-hover:text-cream">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="relative flex flex-col gap-2 group-hover:text-cream">
                  <span
                    style={{ viewTransitionName: `post-${p.slug}` }}
                    className="font-display text-[clamp(28px,4vw,40px)] uppercase leading-[0.9] tracking-[-0.02em]"
                  >
                    {p.title}
                  </span>
                  <span className="text-[11px] uppercase opacity-70">
                    {p.summary}
                  </span>
                </span>
                <span className="relative col-start-2 text-[12px] group-hover:text-cream md:col-start-auto md:text-right">
                  {formatDate(p.date)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
