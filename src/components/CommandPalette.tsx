import { useNavigate } from "@tanstack/react-router";
import { Dialog } from "radix-ui";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { content } from "../content/index.ts";
import { cx } from "../lib/cx.ts";
import { fuzzyFilter } from "../lib/fuzzy.ts";
import type { PopoverId } from "../lib/popover-id.ts";
import { actions, copyEmail, EMAIL, getState, useStore } from "../lib/store.ts";
import { Grain, Kbd } from "./ui.tsx";

interface Command {
  readonly id: string;
  readonly group: string;
  readonly label: string;
  readonly hint?: string;
  readonly shortcut?: string;
  readonly run: () => void;
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

const scrollToId = (id: string) =>
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });

const useCommands = (): Command[] => {
  const navigate = useNavigate();
  return useMemo(() => {
    const open = (id: PopoverId) => () => {
      // Let the palette's exit animation start before the popover enters.
      requestAnimationFrame(() => actions.openPopover(id));
    };
    const latest = content.posts[0];
    const actionsList: Command[] = [
      {
        id: "blog",
        group: "Actions",
        label: "Read the latest post",
        hint: latest?.title ?? "",
        shortcut: "⌥1",
        run: () => {
          if (latest)
            void navigate({ to: "/blog/$slug", params: { slug: latest.slug } });
        },
      },
      {
        id: "email",
        group: "Actions",
        label: "Copy email",
        hint: EMAIL,
        shortcut: "⌥2",
        run: () => void copyEmail(),
      },
      {
        id: "experience",
        group: "Actions",
        label: "View experience",
        shortcut: "⌥3",
        run: () => goHome(navigate, "experience"),
      },
      {
        id: "github",
        group: "Actions",
        label: "Open GitHub",
        hint: "github.com/ben-pick",
        shortcut: "⌥4",
        run: () =>
          window.open("https://github.com/ben-pick", "_blank", "noopener"),
      },
      {
        id: "coffee",
        group: "Actions",
        label: "Book a coffee",
        hint: "Drafts an email",
        shortcut: "⌥5",
        run: () => {
          window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent("Coffee?")}&body=${encodeURIComponent("Hi Ben,\n\nFancy a coffee in Sydney sometime? I'm free on …\n\n")}`;
        },
      },
      {
        id: "projects",
        group: "Navigate",
        label: "Go to projects",
        run: () => goHome(navigate, "projects"),
      },
      {
        id: "terminal",
        group: "Navigate",
        label: "Open the terminal",
        run: () => {
          goHome(navigate, "terminal");
          setTimeout(
            () =>
              document
                .getElementById("terminal-input")
                ?.focus({ preventScroll: true }),
            400,
          );
        },
      },
      {
        id: "contact",
        group: "Navigate",
        label: "Go to contact",
        run: () => goHome(navigate, "contact"),
      },
      {
        id: "linkedin",
        group: "Navigate",
        label: "Open LinkedIn",
        run: () =>
          window.open(
            "https://linkedin.com/in/benpick5/",
            "_blank",
            "noopener",
          ),
      },
    ];
    return [
      ...actionsList,
      ...content.companies.map((c) => ({
        id: `company/${c.slug}`,
        group: "Companies",
        label: c.name,
        hint: `${c.role} · ${c.start} — ${c.end}`,
        run: open({ kind: "company", slug: c.slug }),
      })),
      ...content.projects.map((p) => ({
        id: `project/${p.slug}`,
        group: "Projects",
        label: p.name,
        hint: p.status,
        run: open({ kind: "project", slug: p.slug }),
      })),
      ...content.interests.map((i) => ({
        id: `interest/${i.slug}`,
        group: "Interests",
        label: i.name,
        hint: i.region,
        run: open({ kind: "interest", slug: i.slug }),
      })),
      ...content.posts.map((p) => ({
        id: `post/${p.slug}`,
        group: "Posts",
        label: p.title,
        hint: p.date,
        run: () =>
          void navigate({ to: "/blog/$slug", params: { slug: p.slug } }),
      })),
    ];
  }, [navigate]);
};

const goHome = (navigate: ReturnType<typeof useNavigate>, section: string) => {
  if (window.location.pathname === "/") {
    scrollToId(section);
  } else {
    void navigate({ to: "/", hash: section });
  }
};

const Highlight = ({
  text,
  indices,
}: {
  text: string;
  indices: ReadonlyArray<number>;
}) => {
  if (indices.length === 0) return <>{text}</>;
  const set = new Set(indices);
  const out: ReactNode[] = [];
  for (let i = 0; i < text.length; i++) {
    out.push(
      set.has(i) ? (
        <span key={i} className="underline decoration-1 underline-offset-[3px]">
          {text[i]}
        </span>
      ) : (
        text[i]
      ),
    );
  }
  return <>{out}</>;
};

/** Global keys: ⌘K, type-to-search, ⌥1–5. */
const useGlobalKeys = (commands: Command[]) => {
  useEffect(() => {
    const byShortcut = new Map(
      commands
        .filter((c) => c.shortcut)
        .map((c) => [`Digit${c.shortcut?.slice(1)}`, c]),
    );
    const onKey = (e: KeyboardEvent) => {
      const s = getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.palette.open ? actions.closePalette() : actions.openPalette();
        return;
      }
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        const cmd = byShortcut.get(e.code);
        if (cmd) {
          e.preventDefault();
          actions.closePalette();
          cmd.run();
        }
        return;
      }
      if (
        !e.metaKey &&
        !e.ctrlKey &&
        e.key.length === 1 &&
        /\S/.test(e.key) &&
        !isTyping(e.target) &&
        !s.palette.open &&
        !s.popover
      ) {
        e.preventDefault();
        actions.openPalette(e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commands]);
};

export const CommandPalette = () => {
  const { open, query: initial } = useStore((s) => s.palette);
  const commands = useCommands();
  useGlobalKeys(commands);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seed the query during render so the key that opened the palette is never lost.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery(initial);
      setActive(0);
    }
  }

  const results = useMemo(
    () =>
      fuzzyFilter(
        commands,
        query,
        (c) => `${c.label} ${c.group} ${c.hint ?? ""}`,
      ),
    [commands, query],
  );

  // Keep the active row in view as the selection moves.
  const activeId = results[active]?.item.id;
  useEffect(() => {
    if (!activeId) return;
    document
      .getElementById(`cmd-${activeId}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const runAt = (i: number) => {
    const r = results[i];
    if (!r) return;
    actions.closePalette();
    r.item.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = results.length;
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      setActive((a) => (n ? (a + 1) % n : 0));
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      setActive((a) => (n ? (a - 1 + n) % n : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(active);
    }
  };

  let lastGroup = "";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => (o ? actions.openPalette() : actions.closePalette())}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-panel/45 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in">
          <Grain className="opacity-40" />
        </Dialog.Overlay>
        <Dialog.Content
          onKeyDown={onKeyDown}
          onOpenAutoFocus={(e) => {
            // Radix selects the field's text on focus; keep the caret after the
            // key that opened the palette instead.
            e.preventDefault();
            const input = inputRef.current;
            if (!input) return;
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }}
          className="fixed top-[12vh] left-1/2 z-50 flex max-h-[70vh] w-[min(620px,calc(100vw-32px))] -translate-x-1/2 flex-col border border-cream/20 bg-ink font-mono text-cream outline-none [transform-origin:50%_0] data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search actions, companies, projects and interests. Use arrow keys
            and Enter.
          </Dialog.Description>
          <div className="flex items-center gap-3 border-cream/20 border-b px-5">
            <span aria-hidden="true" className="text-soft">
              ›
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder="What would you like to do?"
              aria-label="Search commands"
              aria-controls="palette-list"
              aria-activedescendant={
                results[active] ? `cmd-${results[active].item.id}` : undefined
              }
              role="combobox"
              aria-expanded="true"
              className="h-14 flex-1 bg-transparent font-mono text-[14px] text-cream outline-none placeholder:text-soft"
            />
            <Kbd>esc</Kbd>
          </div>
          <div
            ref={listRef}
            id="palette-list"
            role="listbox"
            className="relative overflow-y-auto overscroll-contain py-2"
          >
            {results.length === 0 ? (
              <div className="px-5 py-6 text-[12px] uppercase text-soft">
                No matches
              </div>
            ) : null}
            {results.map((r, i) => {
              const header = r.item.group !== lastGroup && query.trim() === "";
              lastGroup = r.item.group;
              return (
                <div key={r.item.id}>
                  {header ? (
                    <div className="px-5 pt-3 pb-1 text-[10px] uppercase tracking-wider text-soft">
                      {r.item.group}
                    </div>
                  ) : null}
                  {/* biome-ignore lint/a11y/useKeyWithClickEvents: options are driven from the combobox input */}
                  <div
                    id={`cmd-${r.item.id}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={i === active}
                    onPointerMove={() => i !== active && setActive(i)}
                    onClick={() => runAt(i)}
                    className={cx(
                      "relative mx-2 flex h-11 cursor-pointer items-center justify-between gap-4 px-3 text-[13px] transition-colors duration-150",
                      i === active ? "bg-cream text-ink" : "text-cream",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={cx(
                          "inline-block w-3 transition-transform duration-200 ease-out-expo",
                          i === active
                            ? "translate-x-0 opacity-100"
                            : "-translate-x-1 opacity-0",
                        )}
                      >
                        →
                      </span>
                      <span className="truncate">
                        <Highlight
                          text={r.item.label}
                          indices={r.match.indices.filter(
                            (x) => x < r.item.label.length,
                          )}
                        />
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-[11px] uppercase opacity-60">
                      {r.item.hint ? (
                        <span className="hidden truncate sm:inline">
                          {r.item.hint}
                        </span>
                      ) : null}
                      {r.item.shortcut ? <Kbd>{r.item.shortcut}</Kbd> : null}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between gap-4 border-cream/20 border-t px-5 py-3 text-[10px] uppercase text-soft">
            <span className="flex items-center gap-2">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> move <Kbd>↵</Kbd> select
            </span>
            <span>Type anywhere to search</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
