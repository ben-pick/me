import { Brackets, PAPER } from "../components/ui.tsx";
import { bannerModel } from "./model.ts";

const DOMAIN = "bpick.dev";

/** 1584×396. LinkedIn's profile photo covers the bottom-left below y≈176. */
export const Banner = () => {
  const b = bannerModel();
  return (
    <div
      style={PAPER}
      className="relative h-[396px] w-[1584px] overflow-hidden bg-cream font-mono text-ink antialiased"
    >
      <div className="absolute top-[30px] left-12 w-[600px]">
        <div className="text-[14px] uppercase leading-[18px]">
          {b.role} / {b.location}
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

      <div className="absolute top-1/2 right-12 -translate-y-1/2 px-11 py-8 text-[26px] uppercase leading-none">
        <Brackets className="text-ink" />
        {DOMAIN} ↗
      </div>
    </div>
  );
};
