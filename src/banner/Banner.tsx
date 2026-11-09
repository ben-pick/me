import { Brackets, Chip, PAPER } from "../components/ui.tsx";
import { cx } from "../lib/cx.ts";
import { bannerModel } from "./model.ts";

const DOMAIN = "bpick.dev";
const PLANE =
  "perspective(1800px) rotateY(-9deg) rotateX(5deg) rotateZ(-1.4deg) scale(.82)";

/** 1584×396. LinkedIn's profile photo covers the bottom-left below y≈176. */
export const Banner = () => {
  const b = bannerModel();
  // Fits the project's name to its card, whatever it's called.
  const titleSize = Math.min(84, 384 / (b.project.name.length * 0.58));
  return (
    <div
      style={PAPER}
      className="relative h-[396px] w-[1584px] overflow-hidden bg-cream font-mono text-ink antialiased"
    >
      <div className="absolute top-[30px] left-12 w-[600px]">
        <div className="flex justify-between text-[14px] uppercase leading-[18px]">
          <span>
            {b.role} / {b.location}
          </span>
          <span>{DOMAIN} ↗</span>
        </div>
        <h1 className="m-0 mt-3 -ml-1 whitespace-nowrap font-display font-normal text-[88px] uppercase leading-[0.86] tracking-[-0.02em]">
          {b.name}
        </h1>
        <div className="mt-[13px] flex gap-[7px] whitespace-nowrap text-[13.5px] uppercase leading-[18px]">
          {b.tags.map((t) => (
            <span key={t} className="border border-ink px-[9px] py-[3px]">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute bottom-[26px] left-[400px] w-[248px] text-right text-[13px] text-muted leading-[18px]">
        {b.coordinates}
      </div>

      <div
        className="absolute top-5 left-[704px] h-[470px] w-[1080px] origin-[0_50%]"
        style={{ transform: PLANE }}
      >
        <section className="absolute top-0 left-0 h-[540px] w-[540px] overflow-hidden border border-ink">
          <div className="grid grid-cols-[38px_1fr_auto] border-ink border-b px-5 py-3 text-[12px] text-muted uppercase">
            <span>N°</span>
            <span>Company</span>
            <span>Role</span>
          </div>
          {b.companies.map((c, i) => (
            <div
              key={c.slug}
              className={cx(
                "grid grid-cols-[38px_1fr_auto] items-baseline border-ink border-b px-5 py-[13px] whitespace-nowrap text-[13px] uppercase",
                i === 0 && "bg-ink text-cream",
              )}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-[42px] leading-[0.95] tracking-[-0.02em]">
                {c.name}
              </span>
              <span>{c.role}</span>
            </div>
          ))}
        </section>

        <section className="absolute top-0 left-[562px] h-[224px] w-[440px]">
          <Brackets className="-m-[8px] text-ink" />
          <div className="flex h-full flex-col gap-3 bg-ink p-7 text-cream">
            <div className="flex justify-between text-[12px] uppercase">
              <span>{b.project.code}</span>
              <span>{b.project.status}</span>
            </div>
            <strong
              className="whitespace-nowrap font-display font-normal uppercase leading-[0.9] tracking-[-0.02em]"
              style={{ fontSize: titleSize }}
            >
              {b.project.name}
            </strong>
            <p className="m-0 text-[14px] leading-[1.42]">{b.project.pitch}</p>
            <div className="mt-auto flex gap-1.5">
              {b.project.tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
          </div>
        </section>

        <section className="absolute top-[240px] left-[562px] flex h-[300px] w-[440px] flex-col gap-3 bg-ink p-7 text-cream">
          <div className="font-display text-[46px] uppercase leading-[0.9] tracking-[-0.02em]">
            {b.headline}
          </div>
          <div className="text-[12px] text-soft uppercase">{b.github} ↗</div>
        </section>
      </div>
    </div>
  );
};
