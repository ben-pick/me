import { useEffect, useRef, useState } from "react";
import type { LogoMerge as Scene } from "../brain/logo-merge.ts";
import { cx } from "../lib/cx.ts";
import { useReducedMotion } from "../lib/hooks.ts";

/** Claude, DeepSeek and Cloudflare, in dots, coming together as the project. */
export const LogoMerge = ({ word }: { word: string }) => {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    let scene: Scene | null = null;
    void Promise.all([
      import("../brain/logo-merge.ts"),
      document.fonts?.ready,
    ]).then(([{ createLogoMerge }]) => {
      if (cancelled || !host.current || !canvas.current) return;
      scene = createLogoMerge({
        host: host.current,
        canvas: canvas.current,
        word,
        reduced,
        onReady: () => setLive(true),
      });
    });
    return () => {
      cancelled = true;
      scene?.dispose();
      setLive(false);
    };
  }, [word, reduced]);

  return (
    <div ref={host} className="absolute inset-0">
      <canvas
        ref={canvas}
        role="img"
        aria-label={`The Claude, DeepSeek and Cloudflare logos coming together to form ${word}`}
        className={cx(
          "block size-full transition-opacity duration-500",
          live ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
};
