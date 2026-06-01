import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const _require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

interface DesignConfig {
  RAW: { light: Record<string, string>; dark: Record<string, string> };
  FONT: { family: string; size: Record<string, string> };
}

function designTokensPlugin(): Plugin {
  const designPath = resolve(__dirname, "src/config/design.cjs");
  const outputPath = resolve(__dirname, "src/config/generated-tokens.css");

  function toKebab(key: string): string {
    return key
      .replace(/([A-Z])/g, "-$1")
      .replace(/(\d+)/g, "-$1")
      .toLowerCase();
  }

  function generate(): void {
    delete _require.cache[designPath];
    const { RAW, FONT } = _require(designPath) as DesignConfig;

    const colorVars = (obj: Record<string, string>): string =>
      Object.entries(obj)
        .map(([k, v]) => `  --color-${toKebab(k)}: ${v};`)
        .join("\n");

    // @theme tells Tailwind v4 to generate text-{key} utilities from these values
    const themeBlock = Object.entries(FONT.size)
      .map(([k, v]) => `  --text-${k}: ${v};`)
      .join("\n");

    // --font-size-* for use in inline style props and FONT.size refs
    const fontSizeVars = Object.entries(FONT.size)
      .map(([k, v]) => `  --font-size-${k}: ${v};`)
      .join("\n");

    const css = [
      "/* AUTO-GENERATED — edit src/config/design.js, not this file */",
      "",
      "@theme {",
      themeBlock,
      "}",
      "",
      ":root {",
      `  --font-family-sans: ${FONT.family};`,
      fontSizeVars,
      colorVars(RAW.light),
      "}",
      "",
      "html.dark {",
      colorVars(RAW.dark),
      "}",
    ].join("\n");

    writeFileSync(outputPath, css, "utf-8");
  }

  return {
    name: "design-tokens",
    enforce: "pre",
    buildStart: generate,
    configureServer(server) {
      server.watcher.add(designPath);
      // Listen to both 'change' and 'add': editors like VS Code do atomic saves
      // (write temp → rename) which chokidar sees as unlink+add, not change.
      const onDesignChange = (file: string) => {
        const normalized = file.replace(/\\/g, "/");
        if (!normalized.endsWith("src/config/design.cjs")) return;
        generate();
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("change", onDesignChange);
      server.watcher.on("add", onDesignChange);
    },
  };
}

class DiscordAuthError extends Error {}

const discordSleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

// These mirror the production handler in api/discord-user.ts — keep the two in
// sync, and see that file for the rationale behind each value.
const DISCORD_CONCURRENCY = 2;
const DISCORD_BUCKET_SAFETY_MARGIN = DISCORD_CONCURRENCY - 1;
const DISCORD_MAX_RETRY_AFTER_SEC = 5;
const DISCORD_DEADLINE_MS = 10_000;
const DISCORD_MAX_RATE_LIMIT_HITS = 4;
const DISCORD_MAX_ATTEMPTS_PER_ID = 2;
const DISCORD_JITTER_MS = 250;

interface DiscordUser {
  username: string;
  global_name: string | null;
  avatar: string | null;
}

type DiscordOutcome =
  | { kind: "ok"; user: DiscordUser }
  | { kind: "absent" }
  | { kind: "unavailable" };

interface DiscordGate {
  pauseUntil: number;
  deadline: number;
  stop: boolean;
  rateLimitHits: number;
  retryAfterSec: number;
}

function discordUserApiPlugin(token: string | undefined): Plugin {
  const API = "https://discord.com/api/v10";

  // All `/users/:id` calls share one rate-limit bucket; after a success, pause
  // the whole pool before the bucket is drained so the next call never 429s.
  function applyBucketHeadroom(res: Response, gate: DiscordGate): void {
    const remaining = Number(res.headers.get("x-ratelimit-remaining"));
    const resetAfter = Number(res.headers.get("x-ratelimit-reset-after"));
    if (!Number.isFinite(remaining) || !Number.isFinite(resetAfter)) return;
    if (resetAfter <= 0) return;
    if (remaining <= DISCORD_BUCKET_SAFETY_MARGIN) {
      const resumeAt =
        Date.now() + resetAfter * 1000 + Math.random() * DISCORD_JITTER_MS;
      gate.pauseUntil = Math.max(gate.pauseUntil, resumeAt);
    }
  }

  async function handleRateLimit(
    res: Response,
    gate: DiscordGate,
  ): Promise<"retry" | "giveup"> {
    const scope = res.headers.get("x-ratelimit-scope");
    // `Retry-After` header and `retry_after` body are both in SECONDS (decimals
    // allowed). Prefer the body for its sub-second precision.
    const headerRetry = Number(res.headers.get("retry-after"));
    let bodyRetry = NaN;
    let bodyGlobal = false;
    try {
      const parsed = (await res.json()) as {
        retry_after?: number;
        global?: boolean;
      };
      if (typeof parsed.retry_after === "number") bodyRetry = parsed.retry_after;
      if (typeof parsed.global === "boolean") bodyGlobal = parsed.global;
    } catch {
      /* non-JSON body → fall back to the header */
    }
    const waitSec =
      Number.isFinite(bodyRetry) && bodyRetry > 0
        ? bodyRetry
        : Number.isFinite(headerRetry) && headerRetry > 0
          ? headerRetry
          : 1;
    gate.retryAfterSec = Math.max(gate.retryAfterSec, Math.ceil(waitSec));

    const global =
      res.headers.get("x-ratelimit-global") === "true" ||
      scope === "global" ||
      bodyGlobal;

    // `shared`-scope limits don't count toward Discord's Cloudflare ban budget.
    if (scope !== "shared") gate.rateLimitHits += 1;

    const resumeAt =
      Date.now() + waitSec * 1000 + Math.random() * DISCORD_JITTER_MS;
    gate.pauseUntil = Math.max(gate.pauseUntil, resumeAt);

    if (
      global ||
      waitSec > DISCORD_MAX_RETRY_AFTER_SEC ||
      resumeAt >= gate.deadline ||
      gate.rateLimitHits >= DISCORD_MAX_RATE_LIMIT_HITS
    ) {
      gate.stop = true;
      return "giveup";
    }
    return "retry";
  }

  async function fetchUser(
    id: string,
    gate: DiscordGate,
  ): Promise<DiscordOutcome> {
    for (let attempt = 0; attempt < DISCORD_MAX_ATTEMPTS_PER_ID; attempt++) {
      if (gate.stop) return { kind: "unavailable" };

      const now = Date.now();
      if (now >= gate.deadline) return { kind: "unavailable" };

      const wait = gate.pauseUntil - now;
      if (wait > 0) {
        if (now + wait >= gate.deadline) return { kind: "unavailable" };
        await discordSleep(wait);
        if (gate.stop) return { kind: "unavailable" };
      }

      const res = await fetch(`${API}/users/${id}`, {
        headers: { Authorization: `Bot ${token}` },
      });

      if (res.status === 429) {
        const verdict = await handleRateLimit(res, gate);
        if (verdict === "giveup") return { kind: "unavailable" };
        continue;
      }
      if (res.status === 401 || res.status === 403) {
        throw new DiscordAuthError(
          `Discord rejected the bot token (${res.status}). Set DISCORD_BOT_TOKEN ` +
            `in .env to a real Bot token (Developer Portal → Bot → Reset Token), ` +
            `not the OAuth2 client secret.`,
        );
      }
      if (res.status === 404) return { kind: "absent" };
      if (!res.ok) return { kind: "unavailable" };

      applyBucketHeadroom(res, gate);

      const u = (await res.json()) as Partial<DiscordUser>;
      return {
        kind: "ok",
        user: {
          username: u.username ?? "Unknown",
          global_name: u.global_name ?? null,
          avatar: u.avatar ?? null,
        },
      };
    }
    return { kind: "unavailable" };
  }

  return {
    name: "discord-user-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/discord-user")) return next();
        res.setHeader("Content-Type", "application/json");
        void (async () => {
          if (!token) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({ error: "DISCORD_BOT_TOKEN not set in .env" }),
            );
            return;
          }
          const url = new URL(req.url!, "http://localhost");
          const idsParam =
            url.searchParams.get("ids") ?? url.searchParams.get("id") ?? "";
          const ids = idsParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 100);
          if (ids.length === 0) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "no ids" }));
            return;
          }
          const users: Record<string, DiscordUser | null> = {};
          let authError: DiscordAuthError | null = null;
          const gate: DiscordGate = {
            pauseUntil: 0,
            deadline: Date.now() + DISCORD_DEADLINE_MS,
            stop: false,
            rateLimitHits: 0,
            retryAfterSec: 0,
          };
          let cursor = 0;
          const worker = async () => {
            while (
              cursor < ids.length &&
              !authError &&
              !gate.stop &&
              Date.now() < gate.deadline
            ) {
              const id = ids[cursor++];
              try {
                const outcome = await fetchUser(id, gate);
                if (outcome.kind === "ok") users[id] = outcome.user;
                else if (outcome.kind === "absent") users[id] = null;
                // "unavailable" → leave out so the client retries it later
              } catch (e) {
                if (e instanceof DiscordAuthError) {
                  authError = e;
                  return;
                }
                /* swallow per-id transport errors; id stays unresolved */
              }
            }
          };
          try {
            await Promise.all(
              Array.from({ length: Math.min(DISCORD_CONCURRENCY, ids.length) },
                () => worker(),
              ),
            );
            if (authError) throw authError;
          } catch (e) {
            const msg = e instanceof Error ? e.message : "fetch failed";
            console.error("[discord-user]", msg);
            res.statusCode = e instanceof DiscordAuthError ? 401 : 502;
            res.end(JSON.stringify({ error: msg }));
            return;
          }
          res.statusCode = 200;
          const payload: {
            users: Record<string, DiscordUser | null>;
            retryAfterSec?: number;
          } = { users };
          if (gate.retryAfterSec > 0) payload.retryAfterSec = gate.retryAfterSec;
          res.end(JSON.stringify(payload));
        })();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Empty prefix => load non-VITE_ vars too (the bot token), for Node-side use only.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      designTokensPlugin(),
      discordUserApiPlugin(env.DISCORD_BOT_TOKEN),
      react(),
      tailwindcss(),
    ],
    // transformers.js (used by sentiment.worker) dynamically imports the ONNX
    // runtime backends, which requires ES-module workers rather than the default
    // IIFE format.
    worker: {
      format: "es",
    },
    // Pre-bundling transformers.js breaks its dynamic backend imports; let Vite
    // resolve it on demand instead.
    optimizeDeps: {
      exclude: ["@huggingface/transformers"],
    },
    server: {
      proxy: {
        "/discord-cdn": {
          target: "https://cdn.discordapp.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/discord-cdn/, ""),
          // Discord/Cloudflare set a __cf_bm cookie scoped to discordapp.com that
          // the browser rejects as foreign (we're on localhost) and images don't
          // need. Strip it so it doesn't spam the console.
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes) => {
              delete proxyRes.headers["set-cookie"];
              // Avatar URLs are content-addressed (hash in path), so they're safe to cache immutably.
              proxyRes.headers["cache-control"] =
                "public, max-age=86400, immutable";
            });
          },
        },
      },
    },
  };
});
