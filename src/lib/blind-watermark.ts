import { constants } from "node:fs";
import { access, chmod } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const DEFAULT_PAYLOAD = "kokosa.icu";
const DEFAULT_SEED = "kokosa";
const DEFAULT_STRENGTH = "15";
const WRAPPER_VERSION = "kokosa-blind-watermark:1";
const CRATE_VERSION = "blind_watermark:0.1.3";

const projectRoot = process.cwd();

export type BlindWatermarkConfig =
  | {
      enabled: false;
      cacheVersion: string;
    }
  | {
      enabled: true;
      binaryPath: string;
      payload: string;
      seed: string;
      strength: string;
      cacheVersion: string;
    };

type EmbedBlindWatermarkOptions = {
  inputPath: string;
  outputPath: string;
  config: Extract<BlindWatermarkConfig, { enabled: true }>;
};

type CommandResult = {
  stdout: string;
  stderr: string;
};

export function getBlindWatermarkConfig(): BlindWatermarkConfig {
  if (!isEnabled(process.env.BLIND_WATERMARK_ENABLED)) {
    return {
      enabled: false,
      cacheVersion: `${WRAPPER_VERSION}:disabled`,
    };
  }

  const payload = process.env.BLIND_WATERMARK_PAYLOAD ?? DEFAULT_PAYLOAD;
  const seed = process.env.BLIND_WATERMARK_SEED ?? DEFAULT_SEED;
  const strength = process.env.BLIND_WATERMARK_STRENGTH ?? DEFAULT_STRENGTH;
  const binaryPath = resolveProjectPath(
    process.env.BLIND_WATERMARK_BIN ?? defaultBinaryPath(),
  );

  if (!payload) {
    throw new Error("BLIND_WATERMARK_PAYLOAD must not be empty.");
  }

  if (!seed) {
    throw new Error("BLIND_WATERMARK_SEED must not be empty.");
  }

  if (!/^[1-9]\d*$/.test(strength)) {
    throw new Error("BLIND_WATERMARK_STRENGTH must be a positive integer.");
  }

  return {
    enabled: true,
    binaryPath,
    payload,
    seed,
    strength,
    cacheVersion: [
      WRAPPER_VERSION,
      CRATE_VERSION,
      "enabled",
      payload,
      seed,
      strength,
    ].join(":"),
  };
}

export async function embedBlindWatermark({
  inputPath,
  outputPath,
  config,
}: EmbedBlindWatermarkOptions): Promise<void> {
  await ensureExecutable(config.binaryPath);

  await runCommand(config.binaryPath, [
    "embed",
    "--input",
    inputPath,
    "--output",
    outputPath,
    "--payload",
    config.payload,
    "--seed",
    config.seed,
    "--strength",
    config.strength,
  ]);
}

function isEnabled(value: string | undefined): boolean {
  return TRUE_VALUES.has(value?.toLowerCase() ?? "");
}

function resolveProjectPath(value: string): string {
  return path.isAbsolute(value) ? value : path.join(projectRoot, value);
}

function defaultBinaryPath(): string {
  if (process.platform === "linux" && process.arch === "x64") {
    return "tools/bin/blind-watermark-linux-x64";
  }

  if (process.platform === "linux" && process.arch === "arm64") {
    return "tools/bin/blind-watermark-linux-arm64";
  }

  return `tools/bin/blind-watermark-${process.platform}-${process.arch}`;
}

async function ensureExecutable(binaryPath: string): Promise<void> {
  try {
    await access(binaryPath, constants.X_OK);
    return;
  } catch {
    // Git usually preserves executable bits, but this keeps Vercel builds
    // tolerant of archives or manual binary replacement.
  }

  try {
    await chmod(binaryPath, 0o755);
    await access(binaryPath, constants.X_OK);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      [
        `Blind watermark binary is not executable: ${binaryPath}`,
        "Build it with `just blind-watermark-musl` or set BLIND_WATERMARK_BIN.",
        reason,
      ].join("\n"),
    );
  }
}

function runCommand(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    child.on("error", (error) => {
      reject(
        new Error(
          `Failed to run blind watermark binary: ${command}\n${error.message}`,
        ),
      );
    });

    child.on("close", (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          [
            `Blind watermark binary exited with code ${code}.`,
            stderr && `stderr:\n${stderr}`,
            stdout && `stdout:\n${stdout}`,
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      );
    });
  });
}
