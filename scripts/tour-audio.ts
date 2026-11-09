/**
 * Builds the tour narration from one recording per stop.
 *
 *   pnpm tour:audio [folder]        # default ~/Documents/demoaudio
 *
 * The folder holds one subfolder per stop, prefixed 01, 02 … in tour order.
 * Each take is trimmed to its first and last sound and otherwise left as
 * recorded, then the takes are joined and levelled. Writes the track and its
 * timings to content/.
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

const GAP_SECONDS = 0.5;
const SAMPLE_RATE = 16000;
/** 10ms analysis frames. */
const FRAME = SAMPLE_RATE / 100;
const AUDIO = /\.(aifc|aiff|aif|wav|m4a|mp3|flac)$/i;
const MP3 = "content/tour-narration.mp3";
const TIMING = "content/tour-timing.json";

const dir = process.argv[2] ?? join(homedir(), "Documents/demoaudio");
const model =
  process.env.WHISPER_MODEL ??
  join(homedir(), ".cache/whisper/ggml-large-v3-turbo-q5_0.bin");
if (!existsSync(dir)) throw new Error(`No recordings at ${dir}`);

const run = (command: string, args: string[]) =>
  execFileSync(command, args, { encoding: "utf8", stdio: "pipe" });

const ffmpeg = (...args: string[]) =>
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);

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

const round = (seconds: number) => Math.round(seconds * 100) / 100;

/** The latest recording in a stop's folder. */
const findTake = (prefix: string) => {
  const folder = readdirSync(dir).find((name) => name.startsWith(prefix));
  if (!folder) throw new Error(`No folder for stop ${prefix} in ${dir}`);
  const take = readdirSync(join(dir, folder))
    .filter((name) => AUDIO.test(name))
    .sort()
    .at(-1);
  if (!take) throw new Error(`No recording in ${folder}`);
  return join(dir, folder, take);
};

/** Where a take's first and last sounds are, in seconds. */
const findSpeech = (source: string, workdir: string) => {
  const raw = join(workdir, "levels.pcm");
  ffmpeg(
    "-i",
    source,
    "-ar",
    String(SAMPLE_RATE),
    "-ac",
    "1",
    "-f",
    "s16le",
    raw,
  );
  const pcm = readFileSync(raw);
  const samples = Math.floor(pcm.length / 2);
  const levels: number[] = [];
  for (let start = 0; start + FRAME < samples; start += FRAME) {
    let sum = 0;
    for (let i = start; i < start + FRAME; i++) {
      sum += (pcm.readInt16LE(i * 2) / 32768) ** 2;
    }
    levels.push(Math.sqrt(sum / FRAME));
  }
  const speech = [...levels].sort((a, b) => a - b)[
    Math.floor(levels.length * 0.9)
  ];
  const gate = (speech ?? 0.05) * 0.25;
  const first = levels.findIndex((level) => level > gate);
  const last = levels.findLastIndex((level) => level > gate);
  if (first < 0) throw new Error(`No speech in ${source}`);
  return { start: first / 100, end: (last + 1) / 100 };
};

/** Word timings for a clip. Whisper splits rare words into several tokens. */
const transcribe = (clip: string, workdir: string) => {
  const base = join(workdir, "words");
  run("whisper-cli", [
    "-m",
    model,
    "-f",
    clip,
    "-l",
    "en",
    "-ojf",
    "-of",
    base,
    "-np",
  ]);
  const { transcription } = JSON.parse(
    readFileSync(`${base}.json`, "utf8"),
  ) as {
    transcription: Array<{
      tokens: Array<{ text: string; offsets: { from: number; to: number } }>;
    }>;
  };
  const words: Array<{ word: string; start: number; end: number }> = [];
  for (const { text, offsets } of transcription.flatMap((s) => s.tokens)) {
    if (text.startsWith("[")) continue;
    const previous = words.at(-1);
    if (previous && !/^\s/.test(text)) {
      previous.word += text;
      previous.end = offsets.to / 1000;
    } else {
      words.push({
        word: text.trim(),
        start: offsets.from / 1000,
        end: offsets.to / 1000,
      });
    }
  }
  return words;
};

const workdir = mkdtempSync(join(tmpdir(), "tour-audio-"));
try {
  const clips: string[] = [];
  const stops: Array<{
    id: string;
    start: number;
    end: number;
    text: string;
  }> = [];
  const words: Array<{ word: string; start: number; end: number }> = [];
  let offset = 0;

  tour.stops.forEach((stop, index) => {
    const prefix = String(index + 1).padStart(2, "0");
    const source = findTake(prefix);
    const speech = findSpeech(source, workdir);
    const start = Math.max(0, speech.start - 0.08);
    const end = Math.min(duration(source), speech.end + 0.12);

    const clip = join(workdir, `${prefix}.wav`);
    ffmpeg(
      "-ss",
      start.toFixed(3),
      "-to",
      end.toFixed(3),
      "-i",
      source,
      "-af",
      `highpass=f=80,afftdn=nf=-32,afade=t=in:d=0.01,afade=t=out:st=${(end - start - 0.04).toFixed(3)}:d=0.04`,
      "-ar",
      "44100",
      "-ac",
      "1",
      clip,
    );

    const length = duration(clip);
    for (const word of transcribe(clip, workdir)) {
      words.push({
        word: word.word,
        start: round(word.start + offset),
        end: round(word.end + offset),
      });
    }
    stops.push({
      id: stop.id,
      start: round(offset),
      end: round(offset + length),
      text: stop.text,
    });
    clips.push(clip);
    console.log(`${prefix} ${stop.id}: ${length.toFixed(1)}s`);
    offset += length + GAP_SECONDS;
  });

  const gap = join(workdir, "gap.wav");
  ffmpeg("-f", "lavfi", "-i", `anullsrc=r=44100:cl=mono:d=${GAP_SECONDS}`, gap);
  const list = join(workdir, "list.txt");
  writeFileSync(
    list,
    clips
      .flatMap((clip, i) => (i === 0 ? [clip] : [gap, clip]))
      .map((file) => `file '${file}'`)
      .join("\n"),
  );
  const joined = join(workdir, "joined.wav");
  ffmpeg("-f", "concat", "-safe", "0", "-i", list, "-c", "copy", joined);

  // Two-pass levelling of the whole track, so stops match in volume.
  const target = "loudnorm=I=-16:TP=-1.5:LRA=11";
  // ffmpeg prints the measurements to stderr, even on success.
  const report = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-i",
      joined,
      "-af",
      `${target}:print_format=json`,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  ).stderr;
  const measured = JSON.parse(
    report.slice(report.lastIndexOf("{"), report.lastIndexOf("}") + 1),
  ) as Record<string, string>;
  ffmpeg(
    "-i",
    joined,
    "-af",
    `${target}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`,
    "-ar",
    "44100",
    "-ac",
    "1",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    MP3,
  );

  writeFileSync(
    TIMING,
    `${JSON.stringify({ duration: round(duration(MP3)), stops, words })}\n`,
  );
  console.log(`\n${MP3}: ${duration(MP3).toFixed(1)}s, ${words.length} words`);
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
