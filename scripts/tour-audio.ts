/**
 * Builds the tour narration from one recording per stop, then transcribes the
 * result so the tour can sync the visuals to each word.
 *
 *   pnpm tour:audio [folder]        # default ~/Documents/demoaudio
 *
 * The folder holds one subfolder per stop, prefixed 01, 02 … in tour order.
 * Each take is trimmed, levelled and joined, and its long pauses are replaced
 * with clean silence so breaths do not sit between sentences. Cuts follow the
 * audio's energy, never whisper's timings, which can drift and clip words.
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

/**
 * Where the take starts and stops speaking: the outermost silences only, so a
 * pause in the middle (or a quiet final word) is never mistaken for the end.
 */
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
  const starts = [...log.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) =>
    Number(m[1]),
  );
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) =>
    Number(m[1]),
  );
  const firstStart = starts[0];
  const firstEnd = ends[0];
  const start =
    firstStart !== undefined && firstStart < 0.2 && firstEnd !== undefined
      ? firstEnd
      : 0;
  let end = total;
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = ends[i];
    if (from === undefined) continue;
    if (to === undefined || total - to < 0.1) end = from;
  }
  return { start, end: Math.max(start, end) };
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

/** Transcribes a file and returns its spoken words with timings. */
const transcribe = (file: string, base: string) => {
  run("whisper-cli", [
    "-m",
    model,
    "-f",
    file,
    "-l",
    "en",
    "-ojf",
    "-of",
    base,
    "-np",
  ]);
  return words(`${base}.json`);
};

const dir = process.argv[2] ?? join(homedir(), "Documents/demoaudio");
const model =
  process.env.WHISPER_MODEL ??
  join(homedir(), ".cache/whisper/ggml-large-v3-turbo-q5_0.bin");
if (!existsSync(dir)) throw new Error(`No recordings at ${dir}`);

const tmp = mkdtempSync(join(tmpdir(), "tour-audio-"));
try {
  const parts: string[] = [];
  const bounds: Array<{ id: string; start: number; end: number }> = [];
  // Offset of this stop within the finished track.
  let offset = 0;
  let timing: Array<{ word: string; start: number; end: number }> = [];

  tour.stops.forEach((stop, index) => {
    const prefix = String(index + 1).padStart(2, "0");
    const folder = readdirSync(dir)
      .filter((name) => name.startsWith(prefix))
      .map((name) => join(dir, name))
      .find((path) => AUDIO.test(readdirSync(path).join("")));
    if (!folder) throw new Error(`No folder for stop ${prefix} in ${dir}`);

    const source = pick(folder);

    // Decode once, so the ends can be found from the audio's own energy.
    const raw = join(tmp, `${prefix}-source.pcm`);
    run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      source,
      "-ar",
      "16000",
      "-ac",
      "1",
      "-f",
      "s16le",
      raw,
    ]);
    const pcm = readFileSync(raw);
    const frames = Math.floor(pcm.length / 2);
    const RMS = (from: number, to: number) => {
      let sum = 0;
      let n = 0;
      for (let i = Math.max(0, from); i < Math.min(frames, to); i++) {
        const v = pcm.readInt16LE(i * 2) / 32768;
        sum += v * v;
        n++;
      }
      return n === 0 ? 0 : Math.sqrt(sum / n);
    };
    const total = duration(source);
    /** Where this take's speech sits, as a level to test the ends against. */
    const speechLevel = (() => {
      const levels: number[] = [];
      for (let f = 0; f + 160 < frames; f += 160) {
        levels.push(RMS(f, f + 160));
      }
      levels.sort((a, b) => a - b);
      return levels[Math.floor(levels.length * 0.9)] ?? 0.05;
    })();
    const levelAt = (t: number) => {
      const f = Math.max(0, Math.floor(t * 16000));
      return RMS(f, f + 160);
    };

    // Trim only the ends: everything before the first sound and after the last
    // one goes, and the take in between is left exactly as recorded.
    const FRAME = 0.01;
    const gate = speechLevel * 0.25;
    let startAt: number | null = null;
    let endAt: number | null = null;
    for (let t = 0; t < total; t += FRAME) {
      if (levelAt(t) > gate) {
        if (startAt === null) startAt = t;
        endAt = t + FRAME;
      }
    }
    const takeStart = Math.max(0, (startAt ?? 0) - 0.08);
    const takeEnd = Math.min(total, (endAt ?? total) + 0.12);

    const filters: string[] = [];
    const span = Math.max(0.05, takeEnd - takeStart);
    filters.push(
      `[0:a]atrim=${takeStart.toFixed(3)}:${takeEnd.toFixed(3)},asetpts=PTS-STARTPTS,` +
        `highpass=f=80,afftdn=nf=-32,` +
        `afade=t=in:d=0.01,afade=t=out:st=${Math.max(0, span - 0.04).toFixed(3)}:d=0.04[out]`,
    );

    const part = join(tmp, `${prefix}.wav`);
    run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      source,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "[out]",
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
        start: word.start + offset,
        end: word.end + offset,
      })),
    );
    bounds.push({ id: stop.id, start: offset, end: offset + length });
    parts.push(part);
    if (index < tour.stops.length - 1) parts.push("gap");
    console.log(
      `${prefix} ${stop.id}: ${length.toFixed(1)}s from ${source.replace(dir, "")}`,
    );
    offset += length + GAP;
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
    `${JSON.stringify({ duration: total, stops: bounds, words: timing }, null, 0)}\n`,
  );
  console.log(
    `\n${mp3} ${total.toFixed(1)}s, ${timing.length} words -> public/tour/timing.json`,
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
