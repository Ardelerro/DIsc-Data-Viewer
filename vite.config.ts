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

function discordUserApiPlugin(token: string | undefined): Plugin {
  const API = "https://discord.com/api/v10";

  async function fetchUser(id: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${API}/users/${id}`, {
        headers: { Authorization: `Bot ${token}` },
      });
      if (res.status === 429) {
        const retry = Number(res.headers.get("retry-after")) || 1;
        await new Promise((r) => setTimeout(r, retry * 1000));
        continue;
      }
      if (res.status === 401 || res.status === 403) {
        throw new DiscordAuthError(
          `Discord rejected the bot token (${res.status}). Set DISCORD_BOT_TOKEN ` +
            `in .env to a real Bot token (Developer Portal → Bot → Reset Token), ` +
            `not the OAuth2 client secret.`,
        );
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Discord API ${res.status}`);
      const u = (await res.json()) as {
        username?: string;
        global_name?: string | null;
        avatar?: string | null;
      };
      return {
        username: u.username ?? "Unknown",
        global_name: u.global_name ?? null,
        avatar: u.avatar ?? null,
      };
    }
    throw new Error("Discord API rate limited");
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
          const users: Record<string, unknown> = {};
          let authError: DiscordAuthError | null = null;
          let cursor = 0;
          const worker = async () => {
            while (cursor < ids.length && !authError) {
              const id = ids[cursor++];
              try {
                users[id] = await fetchUser(id);
              } catch (e) {
                if (e instanceof DiscordAuthError) {
                  authError = e;
                  return;
                }
                users[id] = null;
              }
            }
          };
          try {
            await Promise.all(
              Array.from({ length: Math.min(10, ids.length) }, () => worker()),
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
          res.end(JSON.stringify({ users }));
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
