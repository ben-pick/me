import { Link, useRouterState } from "@tanstack/react-router";
import { Dialog } from "radix-ui";
import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  type Company,
  companyBySlug,
  content,
  type Interest,
  interestBySlug,
  logsForProject,
  type Project,
  projectBySlug,
} from "../content/index.ts";
import { cx } from "../lib/cx.ts";
import { useIsMobile } from "../lib/hooks.ts";
import { parsePopoverHash, popoverHash } from "../lib/popover-id.ts";
import {
  actions,
  type OpenPopover,
  type Tone,
  useStore,
} from "../lib/store.ts";
import { formatDate } from "./Logs.tsx";
import { Markdown } from "./Markdown.tsx";
import { Brackets, Chip, Grain } from "./ui.tsx";

/* ------------------------------------------------------------------ */
/* Hash sync: `#company/kodo` opens that popover, closing clears it. */
/* ------------------------------------------------------------------ */

const usePopoverHash = (current: OpenPopover | null) => {
  useEffect(() => {
    const fromHash = () => {
      const id = parsePopoverHash(window.location.hash);
      if (id) actions.openPopover(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const hash = current ? popoverHash(current.id) : null;
  useEffect(() => {
    const { pathname, search, hash: now } = window.location;
    if (hash && now !== hash) history.replaceState(history.state, "", hash);
    if (!hash && parsePopoverHash(now))
      history.replaceState(history.state, "", pathname + search);
  }, [hash]);
};

/* ----------------------------------------------- */
/* Desktop placement: next to the trigger, clamped. */
/* ----------------------------------------------- */

const GAP = 10;
const EDGE = 16;

const usePlacement = (open: OpenPopover | null, panel: HTMLElement | null) => {
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });
  useLayoutEffect(() => {
    if (!open || !panel) return;
    const place = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = panel.offsetWidth;
      const h = Math.min(panel.scrollHeight, vh - EDGE * 2);
      const a = open.anchor;
      let left = (vw - w) / 2;
      let top = (vh - h) / 2;
      if (a) {
        left = Math.min(Math.max(a.x - w / 2, EDGE), vw - w - EDGE);
        const below = (a.rect?.bottom ?? a.y) + GAP;
        const above = (a.rect?.top ?? a.y) - GAP - h;
        if (below + h <= vh - EDGE) top = below;
        else if (above >= EDGE) top = above;
        else top = Math.min(Math.max(a.y - h / 2, EDGE), vh - h - EDGE);
      }
      const origin = a ? `${a.x - left}px ${a.y - top}px` : "50% 50%";
      setStyle({
        left,
        top,
        maxHeight: vh - EDGE * 2,
        transformOrigin: origin,
      });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(panel);
    window.addEventListener("resize", place);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [open, panel]);
  return style;
};

/* ----------------------------------------- */
/* Mobile sheet: drag the grip down to close. */
/* ----------------------------------------- */

const useSheetDrag = (onClose: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);

  const setDrag = (dy: number, mode: "dragging" | "snapping" | null) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--drag", `${dy}px`);
    el.style.transform = `translateY(${dy}px)`;
    el.dataset.mode = mode ?? "";
  };

  return {
    ref,
    handlers: {
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag(0, "dragging");
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        const d = drag.current;
        if (!d) return;
        const raw = e.clientY - d.y;
        // Rubber-band when pulled upwards.
        d.dy = raw < 0 ? raw * 0.2 : raw;
        setDrag(d.dy, "dragging");
      },
      onPointerUp: () => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        const v = d.dy / Math.max(1, performance.now() - d.t);
        if (d.dy > 120 || v > 0.6) {
          onClose();
        } else {
          setDrag(0, "snapping");
        }
      },
    },
  };
};

/* --------------- */
/* Popover content */
/* --------------- */

const toneClasses: Record<Tone, string> = {
  ink: "bg-ink text-cream border-cream/25",
  cream: "bg-cream text-ink border-ink",
};

const Meta = ({ k, v }: { k: string; v: ReactNode }) => (
  <div className="flex justify-between gap-4 border-current/20 border-b py-2.5 text-[12px] uppercase">
    <span className="opacity-60">{k}</span>
    <span className="text-right">{v}</span>
  </div>
);

const Monogram = ({ name }: { name: string }) => {
  const letters = name
    .replace(/\(.*?\)/g, "")
    .replace(/[^A-Za-z ]/g, "")
    .trim()
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <span className="relative grid size-14 shrink-0 place-items-center font-display text-[22px] uppercase">
      <Brackets />
      {letters}
    </span>
  );
};

const CompanyBody = ({ c, index }: { c: Company; index: number }) => (
  <>
    <div className="flex items-start gap-4">
      <Monogram name={c.name} />
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-[11px] uppercase opacity-60">
          N° {String(index + 1).padStart(2, "0")}
          {c.detail ? ` · ${c.detail}` : ""}
        </span>
        <Dialog.Title className="m-0 font-display text-[44px] uppercase leading-[0.9] tracking-[-0.02em]">
          {c.name}
        </Dialog.Title>
      </div>
    </div>
    <Dialog.Description className="m-0 text-[11px] uppercase opacity-70">
      {c.highlight}
    </Dialog.Description>
    <div>
      <Meta k="Role" v={c.role} />
      <Meta k="Years" v={`${c.start} — ${c.end}`} />
    </div>
    <div className="text-[13px] leading-[1.55]">
      <Markdown tree={c.body} variant="compact" />
    </div>
    <div className="flex flex-wrap gap-1.5">
      {c.stack.map((s) => (
        <Chip key={s}>{s}</Chip>
      ))}
    </div>
    {c.url ? (
      <PanelLink href={c.url}>
        {c.url.replace(/^https?:\/\/(www\.)?/, "")}
      </PanelLink>
    ) : null}
  </>
);

const ProjectBody = ({ p }: { p: Project }) => (
  <>
    <div className="relative aspect-[16/8] overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,#262626_0%,#121212_70%)] p-3 text-cream">
      <Brackets className="m-2" />
      <Grain />
      <span className="absolute top-4 left-5 text-[11px] uppercase text-soft">
        {p.code}
      </span>
      <span className="absolute right-5 bottom-4 text-[11px] uppercase text-soft">
        [Hero image / video]
      </span>
      <span className="absolute inset-0 grid place-items-center font-display text-[56px] uppercase tracking-[-0.02em] opacity-90">
        {p.name}
      </span>
    </div>
    <div className="flex items-baseline justify-between gap-4">
      <Dialog.Title className="m-0 font-display text-[40px] uppercase leading-[0.9] tracking-[-0.02em]">
        {p.name}
      </Dialog.Title>
      <span className="text-[11px] uppercase opacity-70">{p.status}</span>
    </div>
    <Dialog.Description className="m-0 text-[13px] leading-[1.5]">
      {p.pitch}
    </Dialog.Description>
    <div className="text-[13px] leading-[1.55] opacity-85">
      <Markdown tree={p.body} variant="compact" />
    </div>
    <div className="flex flex-wrap gap-1.5">
      {p.tags.map((t) => (
        <Chip key={t}>{t}</Chip>
      ))}
    </div>
    <BuildLog slug={p.slug} />
    {p.links.length > 0 ? (
      <div className="flex flex-wrap gap-3">
        {p.links.map((l) => (
          <PanelLink key={l.href + l.label} href={l.href}>
            {l.label}
          </PanelLink>
        ))}
      </div>
    ) : null}
  </>
);

/** The project's build-log entries, newest first; each opens the full log. */
const BuildLog = ({ slug }: { slug: string }) => {
  const logs = logsForProject(slug);
  if (logs.length === 0) return null;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] uppercase opacity-60">
        <span>Build log</span>
        <span>{logs.length} entries</span>
      </div>
      <ol className="m-0 list-none p-0">
        {logs.map((l) => (
          <li key={l.slug} className="border-current/20 border-b">
            <Link
              to="/logs/$slug"
              params={{ slug: l.slug }}
              className="group grid grid-cols-[92px_1fr_auto] items-baseline gap-3 py-2.5 text-[12px] no-underline"
            >
              <span className="uppercase opacity-60">{formatDate(l.date)}</span>
              <span className="flex flex-col gap-1">
                <span className="uppercase transition-transform duration-300 ease-out-expo group-hover:translate-x-1">
                  {l.title}
                </span>
                <span className="opacity-60">{l.summary}</span>
              </span>
              <span
                aria-hidden="true"
                className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
};

const InterestBody = ({ i }: { i: Interest }) => (
  <>
    <div className="flex justify-between gap-4 pr-14 text-[11px] uppercase opacity-60">
      <span>
        {i.num} / {i.region}
      </span>
      <span>{i.function}</span>
    </div>
    <Dialog.Title className="m-0 font-display text-[64px] uppercase leading-[0.9] tracking-[-0.02em]">
      {i.name}
    </Dialog.Title>
    <Dialog.Description className="m-0 max-w-[420px] text-[13px] leading-[1.5]">
      {i.blurb}
    </Dialog.Description>
    <div>
      {i.facts.map((f) => (
        <Meta key={f.k} k={f.k} v={f.v} />
      ))}
    </div>
  </>
);

const PanelLink = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <a
    href={href}
    target={href.startsWith("http") ? "_blank" : undefined}
    rel="noreferrer"
    className="group relative inline-flex min-h-11 items-center gap-2 self-start px-4 text-[12px] uppercase no-underline"
  >
    <Brackets />
    {children}
    <span className="transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
      ↗
    </span>
  </a>
);

const Body = ({ open }: { open: OpenPopover }) => {
  const { kind, slug } = open.id;
  if (kind === "company") {
    const c = companyBySlug(slug);
    return c ? <CompanyBody c={c} index={companyIndex(slug)} /> : <Missing />;
  }
  if (kind === "project") {
    const p = projectBySlug(slug);
    return p ? <ProjectBody p={p} /> : <Missing />;
  }
  const i = interestBySlug(slug);
  return i ? <InterestBody i={i} /> : <Missing />;
};

const companyIndex = (slug: string) =>
  content.companies.findIndex((c) => c.slug === slug);

const Missing = () => (
  <>
    <Dialog.Title className="m-0 font-display text-[32px] uppercase">
      Not found
    </Dialog.Title>
    <Dialog.Description className="m-0">
      That link points nowhere.
    </Dialog.Description>
  </>
);

const CloseButton = () => (
  <Dialog.Close
    aria-label="Close"
    className="group absolute top-3 right-3 z-10 grid size-11 place-items-center bg-transparent text-[14px] text-current"
  >
    <Brackets />
    <span className="transition-transform duration-300 ease-out-expo group-hover:rotate-90">
      ✕
    </span>
  </Dialog.Close>
);

/* ---- */
/* Host */
/* ---- */

export const PopoverHost = () => {
  const open = useStore((s) => s.popover);
  // Keep the last popover rendered during its exit animation.
  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (open) setShown(open);
  }, [open]);
  usePopoverHash(open);

  // Following a link out of a popover (e.g. a build log) closes it.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    actions.closePopover();
  }, [pathname]);

  const mobile = useIsMobile();
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const placement = usePlacement(mobile ? null : shown, panel);
  const sheet = useSheetDrag(() => actions.closePopover());
  const tone = shown?.tone ?? "ink";

  return (
    <Dialog.Root
      open={open !== null}
      onOpenChange={(o) => !o && actions.closePopover()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-panel/45 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in">
          <Grain className="opacity-40" />
        </Dialog.Overlay>
        {shown ? (
          <Dialog.Content
            key={popoverHash(shown.id)}
            ref={(el) => {
              setPanel(el);
              if (mobile) sheet.ref.current = el;
            }}
            onCloseAutoFocus={(e) => {
              const t = shown.trigger;
              if (t?.isConnected) {
                e.preventDefault();
                t.focus({ preventScroll: true });
              }
            }}
            style={mobile ? undefined : placement}
            className={cx(
              "fixed z-50 flex flex-col overflow-y-auto overscroll-contain border font-mono outline-none",
              toneClasses[tone],
              mobile
                ? "inset-x-0 bottom-0 max-h-[88dvh] border-x-0 border-b-0 pb-[max(24px,env(safe-area-inset-bottom))] data-[mode=snapping]:transition-transform data-[mode=snapping]:duration-300 data-[mode=snapping]:ease-out-expo data-[mode=dragging]:!animate-none data-[mode=snapping]:!animate-none data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in"
                : "w-[min(520px,calc(100vw-32px))] data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in",
            )}
          >
            {mobile ? (
              <div
                {...sheet.handlers}
                className="sticky top-0 z-10 flex h-8 shrink-0 cursor-grab touch-none items-center justify-center bg-inherit active:cursor-grabbing"
              >
                <span className="h-px w-12 bg-current opacity-60" />
              </div>
            ) : null}
            <CloseButton />
            <div
              className={cx(
                "flex flex-col gap-5 [&>*]:animate-rise [&>*:nth-child(2)]:[animation-delay:40ms] [&>*:nth-child(3)]:[animation-delay:80ms] [&>*:nth-child(4)]:[animation-delay:120ms] [&>*:nth-child(5)]:[animation-delay:160ms] [&>*:nth-child(n+6)]:[animation-delay:200ms]",
                mobile ? "px-5 pt-2" : "p-7",
              )}
            >
              <Body open={shown} />
            </div>
          </Dialog.Content>
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
};
