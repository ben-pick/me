import { useSyncExternalStore } from "react";
import { site } from "../content/index.ts";
import type { PopoverId } from "./popover-id.ts";

export type Tone = "ink" | "cream";

export interface Anchor {
  /** Pointer (or trigger centre) in viewport coordinates. */
  readonly x: number;
  readonly y: number;
  readonly rect: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null;
}

export interface OpenPopover {
  readonly id: PopoverId;
  readonly anchor: Anchor | null;
  readonly tone: Tone;
  readonly trigger: HTMLElement | null;
}

interface State {
  readonly popover: OpenPopover | null;
  readonly palette: { open: boolean; query: string };
  readonly interest: string;
  readonly hoverInterest: string | null;
  readonly toast: { id: number; text: string } | null;
  /** Company slug whose preview follows the cursor. */
  readonly preview: string | null;
  /** The boot sequence has finished (or was skipped). */
  readonly booted: boolean;
}

let state: State = {
  popover: null,
  palette: { open: false, query: "" },
  interest: "bouldering",
  hoverInterest: null,
  toast: null,
  preview: null,
  booted: false,
};
const listeners = new Set<() => void>();

const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  for (const l of listeners) l();
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useStore = <T>(select: (s: State) => T): T =>
  useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(state),
  );

export const getState = () => state;

/** Anchor from an element, using the pointer if the event has one. */
export const anchorFrom = (
  el: HTMLElement,
  event?: { clientX: number; clientY: number; detail?: number },
): Anchor => {
  const r = el.getBoundingClientRect();
  const fromPointer =
    event && (event.detail ?? 1) > 0 && event.clientX + event.clientY > 0;
  return {
    x: fromPointer ? event.clientX : r.left + r.width / 2,
    y: fromPointer ? event.clientY : r.top + r.height / 2,
    rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
  };
};

export const actions = {
  openPopover(id: PopoverId, opts: Partial<Omit<OpenPopover, "id">> = {}) {
    if (id.kind === "interest") set({ interest: id.slug });
    set({
      popover: {
        id,
        anchor: opts.anchor ?? null,
        tone: opts.tone ?? (id.kind === "interest" ? "cream" : "ink"),
        trigger: opts.trigger ?? null,
      },
      palette: { ...state.palette, open: false },
    });
  },
  closePopover() {
    set({ popover: null });
  },
  openPalette(query = "") {
    set({ palette: { open: true, query } });
  },
  closePalette() {
    set({ palette: { open: false, query: "" } });
  },
  setInterest(slug: string) {
    set({ interest: slug });
  },
  hoverInterest(slug: string | null) {
    if (state.hoverInterest !== slug) set({ hoverInterest: slug });
  },
  setPreview(slug: string | null) {
    if (state.preview !== slug) set({ preview: slug });
  },
  setBooted() {
    if (!state.booted) set({ booted: true });
  },
  toast(text: string) {
    set({ toast: { id: Date.now(), text } });
  },
  clearToast(id: number) {
    if (state.toast?.id === id) set({ toast: null });
  },
};

export const EMAIL = site.contact.email;

export const copyEmail = async () => {
  try {
    await navigator.clipboard.writeText(EMAIL);
    actions.toast(`Copied ${EMAIL}`);
  } catch {
    actions.toast(EMAIL);
  }
};
