import { Link } from "@tanstack/react-router";
import { content, projectBySlug } from "../content/index.ts";
import { Kbd } from "./ui.tsx";

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export const Logs = () => (
  <div className="flex flex-col gap-2.5 border border-ink p-7">
    <div className="flex justify-between text-[11px] uppercase text-muted">
      <Link to="/logs" className="no-underline hover:text-ink">
        Logs
      </Link>
      <span className="flex items-center gap-2">
        Latest <Kbd>⌥1</Kbd>
      </span>
    </div>
    <ul className="m-0 list-none p-0">
      {content.logs.slice(0, 3).map((p) => (
        <li key={p.slug} className="border-ink border-b last:border-b-0">
          <Link
            to="/logs/$slug"
            params={{ slug: p.slug }}
            className="group relative flex justify-between gap-4 overflow-hidden py-2.5 no-underline"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 origin-bottom scale-y-0 bg-ink transition-transform duration-300 ease-out-expo group-hover:scale-y-100 group-focus-visible:scale-y-100"
            />
            <span className="relative transition-[color,transform] duration-300 ease-out-expo group-hover:translate-x-2 group-hover:text-cream group-focus-visible:translate-x-2 group-focus-visible:text-cream">
              {p.project ? (
                <span className="mr-2 border border-current px-1 text-[10px] uppercase">
                  {projectBySlug(p.project)?.name ?? p.project}
                </span>
              ) : null}
              {p.title}
            </span>
            <span className="relative shrink-0 pr-2 text-[11px] transition-colors duration-300 group-hover:text-cream group-focus-visible:text-cream">
              {formatDate(p.date)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
);
