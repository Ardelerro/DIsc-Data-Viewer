interface DiscordUser {
  username: string;
  global_name: string | null;
  avatar: string | null;
}

const API = "https://discord.com/api/v10";

class DiscordAuthError extends Error {}

async function fetchUser(
  id: string,
  token: string,
): Promise<DiscordUser | null> {
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
        `Discord rejected the bot token (${res.status}).`,
      );
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Discord API ${res.status}`);
    const u = (await res.json()) as Partial<DiscordUser>;
    return {
      username: u.username ?? "Unknown",
      global_name: u.global_name ?? null,
      avatar: u.avatar ?? null,
    };
  }
  throw new Error("Discord API rate limited");
}

export default async function handler(
  req: { query: Record<string, string | string[] | undefined> },
  res: {
    status: (code: number) => typeof res;
    json: (body: unknown) => void;
    setHeader: (name: string, value: string) => void;
  },
): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: "DISCORD_BOT_TOKEN not configured" });
    return;
  }

  const raw = req.query.ids ?? req.query.id ?? "";
  const idsParam = Array.isArray(raw) ? raw.join(",") : raw;
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (ids.length === 0) {
    res.status(400).json({ error: "no ids" });
    return;
  }

  const users: Record<string, DiscordUser | null> = {};
  try {
    for (const id of ids) {
      try {
        users[id] = await fetchUser(id, token);
      } catch (e) {
        if (e instanceof DiscordAuthError) throw e;
        users[id] = null;
      }
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ users });
  } catch (e) {
    const auth = e instanceof DiscordAuthError;
    res
      .status(auth ? 401 : 502)
      .json({ error: e instanceof Error ? e.message : "fetch failed" });
  }
}
