import { useState } from "react";
import { DIAGRAMS } from "../diagrams/data.ts";
import type { DiagramId } from "../diagrams/ids.ts";
import { cx } from "../lib/cx.ts";
import { DiagramPanel } from "./DiagramPanel.tsx";

/**
 * One diagram, or several behind a switcher. Each diagram mounts its own
 * scene, so two subjects never share the same 3D view.
 */
export const Diagrams = ({
  ids,
}: {
  ids: DiagramId | ReadonlyArray<DiagramId>;
}) => {
  const list: ReadonlyArray<DiagramId> = typeof ids === "string" ? [ids] : ids;
  const [active, setActive] = useState(0);
  const id = list[active] ?? list[0];
  if (!id) return null;
  if (list.length === 1) return <DiagramPanel id={id} />;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Diagrams"
        className="mb-6 flex flex-wrap gap-1.5"
      >
        {list.map((d, i) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cx(
              "min-h-9 border px-3 font-mono text-[11px] uppercase transition-colors duration-200",
              i === active
                ? "border-ink bg-ink text-cream"
                : "border-ink bg-transparent text-ink hover:bg-ink/10",
            )}
          >
            {DIAGRAMS[d].title}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <DiagramPanel key={id} id={id} />
      </div>
    </div>
  );
};
