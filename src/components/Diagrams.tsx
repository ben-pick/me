import { useState } from "react";
import type { DiagramId } from "../diagrams/ids.ts";
import { DiagramPanel } from "./DiagramPanel.tsx";

/**
 * One diagram, or several with a switcher drawn inside the panel. Each
 * diagram mounts its own scene, so two subjects never share a 3D view.
 */
export const Diagrams = ({
  ids,
}: {
  ids: DiagramId | ReadonlyArray<DiagramId>;
}) => {
  const list: ReadonlyArray<DiagramId> = typeof ids === "string" ? [ids] : ids;
  const [active, setActive] = useState<DiagramId | undefined>(list[0]);
  if (!active) return null;
  return (
    <DiagramPanel
      key={active}
      id={active}
      tabs={list.length > 1 ? { ids: list, onSelect: setActive } : undefined}
    />
  );
};
