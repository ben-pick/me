/**
 * Builds the tour narration from one recording per stop, then transcribes the
 * result so the tour can sync the visuals to each word.
 *
 *   pnpm tour:audio [folder]        # default ~/Documents/demoaudio
 *
 * The folder holds one subfolder per stop, prefixed 01, 02 … in tour order.
 * Each stop's audio is trimmed, levelled and joined with a short pause, so a
 * re-recording only needs `pnpm tour:audio` again.
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import tour from "../content/tour.json" with { type: "json" };

const GAP = 0.5;
const AUDIO = /\.(aifc|aiff|aif|wav|m4a|mp3|flac)$/i;

const run = (command: string, args: string[]) =>
  execFileSync(command, args, { encoding: "utf8", stdio: "pipe" });

/** ffmpeg and friends write their reports to stderr, even when they succeed. */
const capture = (command: string, args: string[]) => {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr ?? ""}`);
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
};

const duration = (file: string) =>
  Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      file,
    ]),
  );

/** First and last moment with sound, so leading and trailing silence goes. */
const speech = (file: string): { start: number; end: number } => {
  const total = duration(file);
  const log = capture("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    file,
    "-af",
    "silencedetect=n=-45dB:d=0.15",
    "-f",
    "null",
    "-",
  ]);
  const silences = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) =>
    Number(m[1]),
  );
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) =>
    Number(m[1]),
  );
  const first = silences[0];
  return {
    start: first !== undefined && first < total - 0.2 ? first : 0,
    end: starts[starts.length - 1] ?? total,
  };
};

const pick = (dir: string) => {
  const files = readdirSync(dir)
    .filter((name) => AUDIO.test(name))
    .sort();
  const file = files[files.length - 1];
  if (!file) throw new Error(`No recording in ${dir}`);
  return join(dir, file);
};

const words = (json: string) => {
  const parsed = JSON.parse(readFileSync(json, "utf8")) as {
    transcription: Array<{
      tokens: Array<{ text: string; offsets: { from: number; to: number } }>;
    }>;
  };
  return (
    parsed.transcription
      .flatMap((segment) => segment.tokens)
      .map((token) => ({
        word: token.text.replace(/^\s+/, ""),
        start: token.offsets.from / 1000,
        end: token.offsets.to / 1000,
      }))
      // Drop whisper's own markers such as [_BEG_] and punctuation-only tokens.
      .filter(
        (word) => /[\p{L}\p{N}]/u.test(word.word) && !word.word.startsWith("["),
      )
  );
};

const dir = process.argv[2] ?? join(homedir(), "Documents/demoaudio");
const model =
  process.env.WHISPER_MODEL ??
  join(homedir(), ".cache/whisper/ggml-large-v3-turbo-q5_0.bin");
if (!existsSync(dir)) throw new Error(`No recordings at ${dir}`);

const tmp = mkdtempSync(join(tmpdir(), "tour-audio-"));
try {
  const parts: string[] = [];
  let cursor = 0;
  let timing: Array<{ word: string; start: number; end: number }> = [];

  tour.stops.forEach((stop, index) => {
    const prefix = String(index + 1).padStart(2, "0");
    const folder = readdirSync(dir)
      .filter((name) => name.startsWith(prefix))
      .map((name) => join(dir, name))
      .find((path) => AUDIO.test(readdirSync(path).join("")));
    if (!folder) throw new Error(`No folder for stop ${prefix} in ${dir}`);

    const source = pick(folder);
    const { start, end } = speech(source);
    const part = join(tmp, `${prefix}.wav`);
    // Trim, take out rumble and hiss, then level to a consistent -16 LUFS.
    run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      String(Math.max(0, start - 0.15)),
      "-to",
      String(end + 0.2),
      "-i",
      source,
      "-af",
      "highpass=f=80,afftdn=nf=-32",
      "-ar",
      "44100",
      "-ac",
      "1",
      part,
    ]);
    const length = duration(part);
    timing = timing.concat(
      words(
        (() => {
          const base = join(tmp, `${prefix}-words`);
          run("whisper-cli", [
            "-m",
            model,
            "-f",
            part,
            "-l",
            "en",
            "-ojf",
            "-of",
            base,
            "-np",
          ]);
          return `${base}.json`;
        })(),
      ).map((word) => ({
        ...word,
        start: word.start + cursor,
        end: word.end + cursor,
      })),
    );
    parts.push(part);
    if (index < tour.stops.length - 1) parts.push("gap");
    console.log(
      `${prefix} ${stop.id}: ${length.toFixed(1)}s from ${source.replace(dir, "")}`,
    );
    cursor += length + GAP;
  });

  const gap = join(tmp, "gap.wav");
  run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    `anullsrc=r=44100:cl=mono:d=${GAP}`,
    gap,
  ]);
  const list = join(tmp, "list.txt");
  writeFileSync(
    list,
    parts.map((part) => `file '${part === "gap" ? gap : part}'`).join("\n"),
  );
  const mp3 = "public/tour/narration.mp3";
  const joined = join(tmp, "joined.wav");
  run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-c",
    "copy",
    joined,
  ]);
  // Level the finished track, so the joins can't leave stops at different volumes.
  const analysis = capture("ffmpeg", [
    "-hide_banner",
    "-i",
    joined,
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
    "-f",
    "null",
    "-",
  ]);
  const measured = JSON.parse(
    analysis.slice(analysis.lastIndexOf("{"), analysis.lastIndexOf("}") + 1),
  ) as Record<string, string>;
  run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    joined,
    "-af",
    `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`,
    "-ar",
    "44100",
    "-ac",
    "1",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    mp3,
  ]);

  const total = duration(mp3);
  writeFileSync(
    "public/tour/timing.json",
    `${JSON.stringify({ duration: total, words: timing }, null, 0)}\n`,
  );
  console.log(
    `\n${mp3} ${total.toFixed(1)}s, ${timing.length} words -> public/tour/timing.json`,
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
