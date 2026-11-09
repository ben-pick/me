/**
 * A tiny bridge between the tour and the lazily-created WebGL brain. The panel
 * registers its `BrainScene.focus` while the scene exists; the tour can then
 * turn the brain without knowing anything about three.js.
 */

type Focus = (region: string) => void;

let focus: Focus | null = null;

export const registerBrainFocus = (next: Focus | null) => {
  focus = next;
};

export const focusBrainRegion = (region: string) => {
  try {
    focus?.(region);
  } catch {
    // A missing brain or lost WebGL context must never stop the tour.
  }
};
