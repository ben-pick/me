import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { site } from "../content/index.ts";
import { actions } from "../lib/store.ts";
import { Kbd, PAPER } from "./ui.tsx";

const NAV = [
  { href: "experience", label: "Experience" },
  { href: "projects", label: "Projects" },
  { href: "contact", label: "Contact" },
];

const SearchIcon = () => (
  <svg
    aria-hidden="true"
    className="size-3 shrink-0"
    viewBox="0 0 11 11"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
  >
    <rect x="0.6" y="0.6" width="6.4" height="6.4" />
    <path d="M6.8 6.8 10.4 10.4" />
  </svg>
);

/** The page's actions stay reachable, so it sticks to the top while scrolling. */
export const Nav = ({ children }: { children?: ReactNode }) => {
  // Every page renders the nav, inside the boundary that hydrates last.
  useEffect(() => actions.markPageHydrated(), []);
  return (
    <nav
      style={PAPER}
      className="sticky top-0 z-30 -mx-4 -mt-3 bg-cream px-4 pt-3 sm:-mx-8 sm:px-8"
    >
      <div className="flex items-center justify-between gap-4 border-ink border-b pb-4 text-[12px] uppercase">
        <Link to="/" className="no-underline">
          {site.name.first} {site.name.last} — Index
        </Link>
        <div className="flex items-center gap-5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              to="/"
              hash={n.href}
              className="relative hidden no-underline after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out-expo hover:after:origin-left hover:after:scale-x-100 md:inline"
            >
              {n.label}
            </Link>
          ))}
          <div className="flex items-stretch gap-2">
            {children}
            <button
              type="button"
              onClick={() => actions.openPalette()}
              aria-label="Search the site"
              aria-keyshortcuts="Meta+K Control+K"
              className="flex min-h-11 min-w-11 items-center justify-center border border-ink px-3 font-mono text-[11px] uppercase text-muted hover:bg-ink hover:text-cream lg:w-[260px] lg:justify-between"
            >
              <span className="flex items-center gap-2.5">
                <SearchIcon />
                <span className="hidden lg:inline">Search…</span>
              </span>
              <span className="hidden lg:block">
                <Kbd>⌘K</Kbd>
              </span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export { Kbd };
