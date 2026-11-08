import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "../content/parse.ts";
import { complete, run } from "./terminal.ts";

const content = loadContent(resolve("content"));
const text = (input: string) =>
  run(input, content)
    .lines.map((l) => l.text)
    .join("\n");

describe("terminal", () => {
  it("prints now.txt", () => {
    expect(text("cat now.txt")).toBe(
      "Senior SWE at Thanks. Building Nooks on Cloudflare.",
    );
  });

  it("lists projects", () => {
    expect(text("projects")).toContain("Nooks");
  });

  it("lists logs, tagging build logs with their project", () => {
    expect(text("logs")).toContain("[nooks]");
  });

  it("clears via an effect", () => {
    expect(run("clear", content).effect).toEqual({ type: "clear" });
  });

  it("opens popovers by name", () => {
    expect(run("open nooks", content).effect).toEqual({
      type: "open",
      hash: "#project/nooks",
    });
  });

  it("handles sudo hire ben", () => {
    expect(text("sudo hire ben")).toContain("Access granted");
  });

  it("reports unknown commands", () => {
    expect(text("rm -rf /")).toContain("command not found: rm");
  });

  it("tab-completes commands and arguments", () => {
    expect(complete("neo", content)).toBe("neofetch");
    expect(complete("cat no", content)).toBe("cat now.txt");
    expect(complete("open noo", content)).toBe("open nooks");
  });
});
