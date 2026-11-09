import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { site } from "../content/index.ts";
import { actions } from "../lib/store.ts";
import { Kbd } from "./ui.tsx";

const NAV = [
  { href: "experience", label: "Experience" },
  { href: "projects", label: "Projects" },
  { href: "contact", label: "Contact" },
];

export const Nav = () => {
  // Every page renders the nav, inside the boundary that hydrates last.
  useEffect(() => actions.markPageHydrated(), []);
  return (
    <nav className="grid grid-cols-[1fr_auto] items-center gap-4 border-ink border-b pb-4 text-[12px] uppercase md:grid-cols-3">
      <Link to="/" className="no-underline">
        {site.name.first} {site.name.last} — Index
      </Link>
      <span className="hidden text-center md:block">
        {site.role} / {site.location}
      </span>
      <div className="flex items-center justify-end gap-5">
        {NAV.map((n) => (
          <Link
            key={n.href}
            to="/"
            hash={n.href}
            className="relative hidden no-underline after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out-expo hover:after:origin-left hover:after:scale-x-100 sm:inline"
          >
            {n.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => actions.openPalette()}
          aria-label="Open command palette"
          aria-keyshortcuts="Meta+K Control+K"
          className="group flex min-h-11 items-center gap-2 border-0 bg-ink px-3.5 font-mono text-[12px] text-cream transition-transform duration-200 ease-out-expo active:scale-95"
        >
          ⌘K
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out-expo group-hover:max-w-24 group-hover:opacity-70">
            Search
          </span>
        </button>
      </div>
    </nav>
  );
};

export { Kbd };
