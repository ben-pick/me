import { BrainPanel } from "../components/BrainPanel.tsx";
import { CompanyIndex } from "../components/CompanyIndex.tsx";
import { Contact } from "../components/Contact.tsx";
import { ContributionGraph } from "../components/ContributionGraph.tsx";
import { Logs } from "../components/Logs.tsx";
import { Nav } from "../components/Nav.tsx";
import { NowPlaying } from "../components/NowPlaying.tsx";
import { Projects } from "../components/Projects.tsx";
import { site } from "../content/index.ts";

/**
 * The name drops in letter by letter once the boot panel has gone. The delay
 * comes from a CSS variable so server and client render the same markup.
 */
const Letters = ({ word, offset }: { word: string; offset: number }) => (
  <span className="block">
    <span className="sr-only">{word}</span>
    {[...word].map((ch, i) => (
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: letters of a fixed word
        key={i}
        aria-hidden="true"
        style={{
          animationDelay: `calc(var(--boot-delay, 0ms) + ${(offset + i) * 35}ms)`,
        }}
        className="inline-block animate-rise [animation-duration:700ms]"
      >
        {ch}
      </span>
    ))}
  </span>
);

export function Home() {
  return (
    <div className="mx-auto flex max-w-[1216px] flex-col gap-16 px-4 pt-6 pb-16 sm:px-8">
      <Nav />
      <main id="main" className="flex flex-col gap-16">
        <header className="grid grid-cols-1 items-end gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <h1 className="m-0 font-display text-[clamp(56px,7.6vw,104px)] uppercase leading-[0.86] tracking-[-0.02em]">
              <Letters word={site.name.first} offset={0} />
              <Letters word={site.name.last} offset={site.name.first.length} />
            </h1>
            <div className="flex flex-wrap gap-1.5 text-[11px] uppercase">
              {site.tags.map((t, i) => (
                <span
                  key={t}
                  style={{
                    animationDelay: `calc(var(--boot-delay, 0ms) + ${420 + i * 60}ms)`,
                  }}
                  className="animate-rise border border-ink px-2 py-1 transition-colors duration-300 hover:bg-ink hover:text-cream"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <BrainPanel />
            <p className="m-0 max-w-[480px] leading-normal">{site.intro}</p>
            <NowPlaying host />
          </div>
        </header>
        <CompanyIndex />
        <Projects />
        <section
          aria-label="Activity and logs"
          className="grid gap-3.5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]"
        >
          <ContributionGraph />
          <Logs />
        </section>
        <Contact />
      </main>
    </div>
  );
}
