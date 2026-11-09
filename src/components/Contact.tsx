import { useEffect, useRef } from "react";
import { site } from "../content/index.ts";
import { copyEmail, EMAIL } from "../lib/store.ts";
import { Kbd } from "./ui.tsx";

/** ⌘C copies the email while the pointer or focus is on this block. */
export const Contact = () => {
  const ref = useRef<HTMLElement>(null);
  const hovered = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "c") return;
      const within =
        hovered.current || ref.current?.contains(document.activeElement);
      const selection = window.getSelection()?.toString() ?? "";
      if (!within || selection !== "") return;
      e.preventDefault();
      void copyEmail();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const link =
    "group relative inline-flex items-center gap-2 self-start py-1 text-cream no-underline after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:bg-current after:transition-transform after:duration-500 after:ease-out-expo hover:after:scale-x-0 hover:after:origin-right";

  return (
    <section
      ref={ref}
      id="contact"
      data-tour="contact"
      aria-label="Contact"
      onPointerEnter={() => {
        hovered.current = true;
      }}
      onPointerLeave={() => {
        hovered.current = false;
      }}
      className="relative scroll-mt-6 flex flex-wrap items-end justify-between gap-7 overflow-hidden bg-ink px-6 py-12 text-cream md:px-10"
    >
      <p className="relative m-0 max-w-[600px] font-display text-[clamp(40px,6vw,56px)] uppercase leading-[0.9] tracking-[-0.02em]">
        {site.contact.headline}
      </p>
      <div className="relative flex flex-col gap-2.5 text-[12px] uppercase">
        <span className="flex items-center gap-3">
          <a href={`mailto:${EMAIL}`} className={link}>
            {EMAIL}
          </a>
          <button
            type="button"
            onClick={() => void copyEmail()}
            aria-label="Copy email address"
            className="border-0 bg-transparent p-1 text-cream transition-transform duration-200 active:scale-90"
          >
            <Kbd>⌘C</Kbd>
          </button>
        </span>
        {[site.contact.github, site.contact.linkedin].map((href) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noreferrer"
            className={link}
          >
            {href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
          </a>
        ))}
      </div>
    </section>
  );
};
