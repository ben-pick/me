import { useEffect, useRef, useState } from "react";
import { content } from "../content/index.ts";
import { toggleSong } from "../lib/audio.ts";
import { cx } from "../lib/cx.ts";
import { complete, type Line, run } from "../lib/terminal.ts";

interface Entry {
  readonly id: number;
  readonly cmd: string | null;
  readonly lines: ReadonlyArray<Line>;
}

interface GithubActivity {
  readonly events: ReadonlyArray<{
    repo: string;
    type: string;
    when: string;
    summary: string;
  }>;
}

let nextId = 0;
const entry = (cmd: string | null, lines: ReadonlyArray<Line>): Entry => ({
  id: nextId++,
  cmd,
  lines,
});

const INITIAL = [entry("cat now.txt", run("cat now.txt", content).lines)];

const LineView = ({ line }: { line: Line }) => {
  if (line.kind === "link")
    return (
      <a
        href={line.href}
        className="text-cream underline underline-offset-[3px]"
      >
        {line.text}
      </a>
    );
  return (
    <div
      className={cx("whitespace-pre-wrap", line.kind === "dim" && "text-grey")}
    >
      {line.text}
    </div>
  );
};

const fetchGithub = async (): Promise<ReadonlyArray<Line>> => {
  try {
    const res = await fetch("/api/github");
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as GithubActivity;
    if (data.events.length === 0)
      return [{ kind: "dim", text: "No recent public activity." }];
    return data.events.map((e) => ({
      kind: "out",
      text: `${e.when.slice(0, 10)}  ${e.repo.padEnd(28)} ${e.summary}`,
    }));
  } catch {
    return [{ kind: "dim", text: "gh: couldn't reach GitHub right now." }];
  }
};

export const Terminal = () => {
  const [history, setHistory] = useState<Entry[]>(INITIAL);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const past = useRef<string[]>([]);
  const cursor = useRef(-1);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every new entry
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [history]);

  const submit = (cmd: string) => {
    const result = run(cmd, content);
    if (cmd.trim()) past.current = [cmd, ...past.current].slice(0, 50);
    cursor.current = -1;
    setValue("");
    if (result.effect?.type === "clear") {
      setHistory([]);
      return;
    }
    const e = entry(cmd, result.lines);
    setHistory((h) => [...h, e]);
    if (result.effect?.type === "open") {
      const hash = result.effect.hash;
      setTimeout(() => {
        window.location.hash = hash;
      }, 250);
    }
    if (result.effect?.type === "play") void toggleSong();
    if (result.effect?.type === "github") {
      void fetchGithub().then((lines) =>
        setHistory((h) => [...h, entry(null, lines)]),
      );
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit(value);
    } else if (e.key === "Tab") {
      const next = complete(value, content);
      if (next) {
        e.preventDefault();
        setValue(next);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      cursor.current = Math.min(cursor.current + 1, past.current.length - 1);
      setValue(past.current[cursor.current] ?? value);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      cursor.current = Math.max(cursor.current - 1, -1);
      setValue(
        cursor.current === -1 ? "" : (past.current[cursor.current] ?? ""),
      );
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setHistory([]);
    } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      setHistory((h) => [...h, entry(`${value}^C`, [])]);
      setValue("");
    }
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: clicking the panel just focuses the input, which is keyboard-reachable itself
    <div
      id="terminal"
      onClick={() => {
        if (!window.getSelection()?.toString())
          input.current?.focus({ preventScroll: true });
      }}
      className={cx(
        "flex min-h-[220px] cursor-text scroll-mt-6 flex-col bg-ink p-7 leading-[1.6] text-cream outline outline-1 -outline-offset-1 transition-[outline-color] duration-300",
        focused ? "outline-cream/30" : "outline-transparent",
      )}
    >
      <div className="mb-2 flex justify-between text-[11px] uppercase text-soft">
        <span>zsh — ben@sydney</span>
        <span>{focused ? "help · tab · ↑ · ⌃L" : "⌃L"}</span>
      </div>
      <div
        ref={scroller}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
        className="max-h-[260px] flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
      >
        {history.map((h) => (
          <div key={h.id} className="animate-rise [animation-duration:240ms]">
            {h.cmd !== null ? (
              <div className="text-grey">~ % {h.cmd}</div>
            ) : null}
            {h.lines.map((l, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: lines never reorder
              <LineView key={i} line={l} />
            ))}
          </div>
        ))}
        <label className="flex items-center text-grey">
          <span className="shrink-0">~ %&nbsp;</span>
          <span className="relative flex-1">
            <input
              ref={input}
              id="terminal-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              aria-label="Terminal command. Type help for a list."
              className="w-full border-0 bg-transparent p-0 font-mono text-[13px] text-transparent caret-transparent outline-none focus-visible:outline-none"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 whitespace-pre text-cream"
            >
              {value}
              <span
                className={cx(
                  "text-cream",
                  focused ? "animate-blink" : "opacity-60",
                )}
              >
                █
              </span>
            </span>
          </span>
        </label>
      </div>
    </div>
  );
};
