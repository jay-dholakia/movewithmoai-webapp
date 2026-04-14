import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnvConfig } from "@next/env";

/**
 * Prefer OPENAI_API_KEY (server-only). NEXT_PUBLIC_OPENAI_API_KEY also works on the
 * server in Node; it is exposed to the browser bundle — avoid for production secrets.
 */

const KEY_NAMES = [
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_OPENAI_API_KEY",
  "OPENAI_KEY",
] as const;

let envLoaded = false;

function hasNextAppRoot(dir: string): boolean {
  if (!fs.existsSync(path.join(dir, "package.json"))) return false;
  if (!fs.existsSync(path.join(dir, "node_modules"))) return false;
  return (
    fs.existsSync(path.join(dir, "next.config.ts")) ||
    fs.existsSync(path.join(dir, "next.config.js")) ||
    fs.existsSync(path.join(dir, "next.config.mjs")) ||
    fs.existsSync(path.join(dir, "next.config.cjs"))
  );
}

/** Next app root (works from source or .next/server chunks). */
function findPackageRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 25; i++) {
    if (hasNextAppRoot(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).trim();
    if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).trim();
  }
  return t;
}

/** Minimal .env parser (handles spaces around `=`, quotes, BOM, comments). */
function parseDotEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const text = content.replace(/^\uFEFF/, "");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const rawKey = trimmed.slice(0, eq).trim().replace(/^export\s+/i, "");
    let val = trimmed.slice(eq + 1).trim();
    val = stripQuotes(val);
    out[rawKey] = val;
  }
  return out;
}

/** Merge .env then .env.local so local overrides; return first configured key. */
function readOpenAiKeyFromDisk(root: string): string | undefined {
  const merged: Record<string, string> = {};
  for (const file of [".env", ".env.local"] as const) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    try {
      Object.assign(merged, parseDotEnvFile(fs.readFileSync(full, "utf8")));
    } catch {
      continue;
    }
  }
  for (const name of KEY_NAMES) {
    const v = merged[name];
    if (v === undefined) continue;
    const t = stripQuotes(v).trim();
    if (t.length > 0) return t;
  }
  return undefined;
}

/** Best-effort: mirror keys into process.env (some runtimes ignore writes). */
function mergeOpenAiKeysFromEnvFiles(root: string) {
  for (const file of [".env", ".env.local"] as const) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    let content: string;
    try {
      content = fs.readFileSync(full, "utf8");
    } catch {
      continue;
    }
    const parsed = parseDotEnvFile(content);
    for (const name of KEY_NAMES) {
      const v = parsed[name];
      if (v === undefined) continue;
      const t = stripQuotes(v).trim();
      if (t.length === 0) continue;
      try {
        process.env[name] = t;
      } catch {
        // ignore non-writable process.env
      }
    }
  }
}

function ensureAppEnvLoaded() {
  if (envLoaded) return;
  envLoaded = true;

  const root = findPackageRoot();
  loadEnvConfig(root);
  mergeOpenAiKeysFromEnvFiles(root);
}

export function getOpenAIApiKey(): string | undefined {
  const root = findPackageRoot();
  ensureAppEnvLoaded();

  for (const name of KEY_NAMES) {
    const raw = process.env[name];
    if (typeof raw !== "string") continue;
    const t = stripQuotes(raw.trim());
    if (t.length > 0) return t;
  }

  // Webpack / some hosts do not keep writes to process.env — read .env directly.
  return readOpenAiKeyFromDisk(root);
}

/** For 503 diagnostics only — no secrets. */
export function getOpenAIEnvDebugInfo(): {
  packageRoot: string;
  dotenvFiles: { name: string; exists: boolean }[];
  keysInProcessEnv: Record<string, boolean>;
  keysInDotEnvFiles: Record<string, boolean>;
} {
  const root = findPackageRoot();
  const dotenvFiles = [".env", ".env.local"].map((name) => ({
    name,
    exists: fs.existsSync(path.join(root, name)),
  }));

  const mergedFromDisk: Record<string, string> = {};
  for (const file of [".env", ".env.local"] as const) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    try {
      Object.assign(mergedFromDisk, parseDotEnvFile(fs.readFileSync(full, "utf8")));
    } catch {
      // ignore
    }
  }
  const keysInDotEnvFiles: Record<string, boolean> = {
    OPENAI_API_KEY: false,
    NEXT_PUBLIC_OPENAI_API_KEY: false,
    OPENAI_KEY: false,
  };
  for (const name of KEY_NAMES) {
    const v = mergedFromDisk[name];
    keysInDotEnvFiles[name] =
      v !== undefined && stripQuotes(v).trim().length > 0;
  }

  ensureAppEnvLoaded();
  const keysInProcessEnv: Record<string, boolean> = {
    OPENAI_API_KEY: false,
    NEXT_PUBLIC_OPENAI_API_KEY: false,
    OPENAI_KEY: false,
  };
  for (const name of KEY_NAMES) {
    const raw = process.env[name];
    keysInProcessEnv[name] =
      typeof raw === "string" && stripQuotes(raw.trim()).length > 0;
  }

  return { packageRoot: root, dotenvFiles, keysInProcessEnv, keysInDotEnvFiles };
}

export function getOpenAIModel(): string {
  ensureAppEnvLoaded();
  const raw = process.env.OPENAI_MODEL;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  const root = findPackageRoot();
  for (const file of [".env", ".env.local"] as const) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    try {
      const parsed = parseDotEnvFile(fs.readFileSync(full, "utf8"));
      const m = parsed.OPENAI_MODEL;
      if (m && stripQuotes(m).trim()) return stripQuotes(m).trim();
    } catch {
      // ignore
    }
  }
  return "gpt-4o-mini";
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function openaiChatJsonContent(
  messages: ChatMessage[],
): Promise<string> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing OpenAI API key: set OPENAI_API_KEY or NEXT_PUBLIC_OPENAI_API_KEY",
    );
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      messages,
      temperature: 0.35,
      response_format: { type: "json_object" },
    }),
  });

  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`OpenAI response not JSON (HTTP ${res.status})`);
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" &&
      data &&
      "error" in data &&
      typeof (data as { error?: { message?: string } }).error?.message ===
        "string"
        ? (data as { error: { message: string } }).error.message
        : raw.slice(0, 400);
    throw new Error(`OpenAI error (${res.status}): ${msg}`);
  }

  const content = (data as { choices?: { message?: { content?: string } }[] })
    ?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI returned empty content");
  }
  return content;
}

export function stripJsonFence(text: string): string {
  const t = text.trim();
  if (t.startsWith("```")) {
    return t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
  }
  return t;
}
