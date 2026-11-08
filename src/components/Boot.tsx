import { useEffect, useState } from "react";
import { content } from "../content/index.ts";
import { actions } from "../lib/store.ts";
import { Grain } from "./ui.tsx";

const LINES = [
  "BENJAMIN PICK — INDEX",
  "SYDNEY 33.87°S 151.21°E",
  `MOUNTING CORTEX ${".".repeat(10)} OK`,
  `MAPPING ${content.interests.length} REGIONS ${".".repeat(6)} OK`,
  `INDEXING ${content.companies.length} ROLES, ${content.logs.length} LOGS ${".".repeat(2)} OK`,
];
const STEP = 170;
const HOLD = 260;
export const BOOT_KEY = "bp-booted";

/**
 * First-visit boot sequence: a few terminal lines, then the panel wipes up to
 * reveal the page. Skippable with any key or click; once per session; never
 * with reduced motion (the inline script in the root marks those as booted).
 */
export const Boot = () => {
  const [phase, setPhase] = useState<"typing" | "leaving" | "done">("typing");
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (document.documentElement.dataset.booted === "1") {
      setPhase("done");
      actions.setBooted();
      return;
    }
    const finish = () => {
      setPhase((p) => (p === "typing" ? "leaving" : p));
      try {
        sessionStorage.setItem(BOOT_KEY, "1");
      } catch {
        // Storage can be blocked; the boot just plays again next time.
      }
    };
    const timers = LINES.map((_, i) =>
      setTimeout(() => setShown(i + 1), 80 + i * STEP),
    );
    timers.push(setTimeout(finish, 80 + LINES.length * STEP + HOLD));
    const skip = () => finish();
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    return () => {
      for (const t of timers) clearTimeout(t);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, []);

  useEffect(() => {
    if (phase !== "leaving") return;
    actions.setBooted();
    const t = setTimeout(() => setPhase("done"), 700);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[90] flex flex-col justify-end bg-ink p-6 font-mono text-[12px] uppercase text-cream transition-[clip-path] duration-700 ease-out-expo [html[data-booted]_&]:hidden sm:p-10 ${phase === "leaving" ? "[clip-path:inset(0_0_100%_0)]" : "[clip-path:inset(0_0_0_0)]"}`}
    >
      <Grain className="opacity-60" />
      <div className="relative flex flex-col gap-1.5">
        {LINES.slice(0, shown).map((l, i) => (
          <span
            key={l}
            className={i === shown - 1 ? "text-cream" : "text-soft"}
          >
            {l}
          </span>
        ))}
        <span className="mt-4 flex gap-1">
          {Array.from({ length: 24 }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length progress dots
              key={i}
              className={`size-1.5 transition-colors duration-150 ${i < (shown / LINES.length) * 24 ? "bg-cream" : "bg-line-dark"}`}
            />
          ))}
        </span>
        <span className="mt-3 text-[10px] text-grey">
          Press any key to skip
        </span>
      </div>
    </div>
  );
};
