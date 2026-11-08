import { describe, expect, it } from "vitest";
import {
  fromGraphql,
  parseContributionsHtml,
  toWeeks,
} from "./contributions.ts";

const FIXTURE = `
<h2 class="f4 text-normal mb-2">
  1,234
    contributions
      in the last year
</h2>
<table><tbody><tr>
<td tabindex="0" data-ix="0" style="width: 10px" data-date="2026-11-01" id="contribution-day-component-0-0" data-level="0" role="gridcell" class="ContributionCalendar-day"></td>
<td tabindex="0" data-ix="0" style="width: 10px" data-date="2026-11-02" id="contribution-day-component-1-0" data-level="2" role="gridcell" class="ContributionCalendar-day"></td>
<td tabindex="0" data-ix="0" style="width: 10px" data-date="2026-11-03" id="contribution-day-component-2-0" data-level="4" role="gridcell" class="ContributionCalendar-day"></td>
</tr></tbody></table>
<tool-tip id="t1" for="contribution-day-component-0-0" popover="manual">No contributions on November 1st.</tool-tip>
<tool-tip id="t2" for="contribution-day-component-1-0" popover="manual">3 contributions on November 2nd.</tool-tip>
<tool-tip id="t3" for="contribution-day-component-2-0" popover="manual">1,024 contributions on November 3rd.</tool-tip>
`;

describe("contributions", () => {
  it("parses GitHub's calendar fragment", () => {
    const c = parseContributionsHtml("ben-pick", FIXTURE);
    expect(c.total).toBe(1234);
    expect(c.days).toEqual([
      { date: "2026-11-01", level: 0, count: 0 },
      { date: "2026-11-02", level: 2, count: 3 },
      { date: "2026-11-03", level: 4, count: 1024 },
    ]);
  });

  it("buckets GraphQL counts into levels", () => {
    const c = fromGraphql(
      "ben-pick",
      [
        {
          contributionDays: [
            { date: "2026-11-01", contributionCount: 0 },
            { date: "2026-11-02", contributionCount: 8 },
          ],
        },
      ],
      8,
    );
    expect(c.days.map((d) => d.level)).toEqual([0, 4]);
  });

  it("groups days into Sunday-first weeks", () => {
    // 2026-11-03 is a Tuesday: the first week is padded with Sun + Mon.
    const days = ["03", "04", "05", "06", "07", "08"].map((d) => ({
      date: `2026-11-${d}`,
      count: 1,
      level: 1,
    }));
    const weeks = toWeeks(days);
    expect(weeks[0]?.slice(0, 2)).toEqual([null, null]);
    expect(weeks[0]).toHaveLength(7);
    expect(weeks[1]?.[0]?.date).toBe("2026-11-08");
  });
});
