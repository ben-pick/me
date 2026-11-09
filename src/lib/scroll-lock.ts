import { useEffect } from "react";

/**
 * The page keeps its own overflow while a modal dialog is open (see the
 * <body> in __root.tsx), so nothing re-lays out. Radix's lock still blocks
 * wheel and touch scrolling outside the dialog, but not keys: focus can sit
 * in the palette's field or on the trigger behind a popover, and PageDown,
 * End or Space would scroll the page. While locked, those keys only scroll
 * something inside the dialog.
 */

const LOCKED = "data-scroll-locked";
const SCROLL_KEYS = new Set([
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
  "ArrowUp",
  "ArrowDown",
]);
const FIELD = "input, textarea, select, [contenteditable]";
const ACTIVATES_ON_SPACE = `${FIELD}, button, a, [role=button], [role=checkbox], [role=switch]`;

const scrollable = (el: Element) => {
  const { overflowY } = getComputedStyle(el);
  return (
    (overflowY === "auto" || overflowY === "scroll") &&
    el.scrollHeight > el.clientHeight
  );
};

/** True when the key would scroll a scroller inside the dialog it came from. */
const scrollsInsideDialog = (target: Element) => {
  const dialog = target.closest("[role=dialog]");
  if (!dialog) return false;
  for (let el: Element | null = target; el; el = el.parentElement) {
    if (scrollable(el)) return true;
    if (el === dialog) break;
  }
  return false;
};

const onKeyDown = (e: KeyboardEvent) => {
  if (e.defaultPrevented || !SCROLL_KEYS.has(e.key)) return;
  if (!document.body.hasAttribute(LOCKED)) return;
  const target = e.target instanceof Element ? e.target : null;
  if (target) {
    // Fields keep their caret keys, and Space still types or presses.
    const paging = e.key === "PageUp" || e.key === "PageDown";
    if (!paging && target.closest(FIELD)) return;
    if (e.key === " " && target.closest(ACTIVATES_ON_SPACE)) return;
    if (scrollsInsideDialog(target)) return;
  }
  e.preventDefault();
};

export const useScrollLockKeys = () =>
  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
