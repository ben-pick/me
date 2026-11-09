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

    // Cut to the first and last spoken word, not to the first quiet moment:
    // breaths and chair noise sit well above the noise floor and would survive.
    const decoded = join(tmp, `${prefix}-source.wav`);
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
      decoded,
    ]);
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
    // Quietest 10ms frame in a window: whisper's edges are rough, the audio isn't.
    const quietest = (from: number, to: number) => {
      const step = 160;
      let best = from;
      let level = Number.POSITIVE_INFINITY;
      for (
        let f = Math.max(0, Math.floor(from * 16000));
        f < Math.min(frames - step, to * 16000);
        f += step
      ) {
        const r = RMS(f, f + step);
        if (r < level) {
          level = r;
          best = f / 16000;
        }
      }
      return best;
    };
    /** Where the take's speech sits, as a level to test pauses against. */
    const speechLevel = (() => {
      const levels: number[] = [];
      for (let f = 0; f + 160 < frames; f += 160) {
        levels.push(RMS(f, f + 160));
      }
      levels.sort((a, b) => a - b);
      return levels[Math.floor(levels.length * 0.9)] ?? 0.05;
    })();
    /** Frame level at a time, in seconds. */
    const levelAt = (t: number) => {
      const f = Math.max(0, Math.floor(t * 16000));
      return RMS(f, f + 160);
    };
    /** Edge of the speech inside a pause: no frame above this is ever cut. */
    const threshold = speechLevel * 0.2;
    /** Loudest 10ms frame in a span, for telling a pause from missed speech. */
    const loudest = (from: number, to: number) => {
      const step = 160;
      let level = 0;
      for (
        let f = Math.max(0, Math.floor(from * 16000));
        f < Math.min(frames - step, to * 16000);
        f += step
      ) {
        level = Math.max(level, RMS(f, f + step));
      }
      return level;
    };
    const quietLevel = (at: number) =>
      RMS(Math.floor(at * 16000), Math.floor(at * 16000) + 160);
    // Generous windows: whisper sometimes drops a trailing word, and a tight
    // cut would remove real speech. Both prefer the quietest point found.
    const snapStart = (t: number) => quietest(t - 0.5, t + 0.03);
    const snapEnd = (t: number) => quietest(t + 0.02, t + 0.7) + 0.01;

    const spoken = transcribe(decoded, join(tmp, `${prefix}-source-words`));
    const total = duration(source);
    const first = spoken[0];
    const last = spoken[spoken.length - 1];
    const { start, end } =
      first && last
        ? {
            start: Math.max(0, first.start - 0.12),
            end: Math.min(total, last.end + 0.2),
          }
        : speech(source);

    // Split the take on the audio's own energy, not on whisper's timings: those
    // drift by up to a second over pauses, and cutting by them clips words.
    const FRAME = 0.01;
    const floor = speechLevel * 0.06;
    const runs: Array<{ start: number; end: number; peak: number }> = [];
    let open: number | null = null;
    let peak = 0;
    for (let t = 0; t < total; t += FRAME) {
      const level = levelAt(t);
      if (level > floor) {
        if (open === null) {
          open = t;
          peak = 0;
        }
        peak = Math.max(peak, level);
      } else if (open !== null) {
        runs.push({ start: open, end: t, peak });
        open = null;
      }
    }
    if (open !== null) runs.push({ start: open, end: total, peak });

    // A breath is a short, isolated burst that sits well below the speech around
    // it. Anything that could be a word is kept: dropped words are worse than
    // an audible breath.
    const speechPeak = speechLevel;
    // Runs closer than a natural pause are one phrase.
    const runs2: typeof runs = [];
    for (const run of runs) {
      const last = runs2[runs2.length - 1];
      if (last && run.start - last.end < 0.25) {
        last.end = run.end;
        last.peak = Math.max(last.peak, run.peak);
      } else runs2.push({ ...run });
    }

    const kept = runs2.filter((run, i) => {
      const before = runs2[i - 1];
      const after = runs2[i + 1];
      const isolated =
        (!before || run.start - before.end > 0.12) &&
        (!after || after.start - run.end > 0.12);
      const short = run.end - run.start < 0.6;
      const quiet = run.peak < speechPeak * 0.5;
      return !(isolated && short && quiet);
    });
    if (kept.length === 0) throw new Error(`No speech in ${source}`);

    const segments = kept.map((run, i) => {
      const previous = kept[i - 1];
      return {
        start: Math.max(0, run.start - (i === 0 ? 0.03 : 0.02)),
        end: Math.min(total, run.end + (i === kept.length - 1 ? 0.08 : 0.02)),
        // Keep the rhythm: a pause stays about as long as it was, up to a limit.
        // Never longer than the pause it replaces.
        gap: previous
          ? (() => {
              const pause = run.start - previous.end;
              return pause < 0.12 ? pause : Math.min(0.3, pause);
            })()
          : 0,
      };
    });

    const filters: string[] = [];
    const labels: string[] = [];
    segments.forEach((segment, i) => {
      const length = Math.max(0.05, segment.end - segment.start);
      const fade = Math.min(0.02, length / 4);
      filters.push(
        `[0:a]atrim=${segment.start.toFixed(3)}:${segment.end.toFixed(3)},asetpts=PTS-STARTPTS,` +
          `afade=t=in:d=${fade.toFixed(3)},afade=t=out:st=${(length - fade).toFixed(3)}:d=${fade.toFixed(3)}[p${i}]`,
      );
      labels.push(`[p${i}]`);
      if (i < segments.length - 1) {
        const pause = segments[i + 1]?.gap ?? 0.15;
        filters.push(`aevalsrc=0:d=${pause.toFixed(3)}:s=44100[g${i}]`);
        labels.push(`[g${i}]`);
      }
    });
    filters.push(
      `${labels.join("")}concat=n=${labels.length}:v=0:a=1,highpass=f=80,afftdn=nf=-32[out]`,
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
