# Discord Data Viewer

A fully client side viewer for a exported Discord data package. Drop in the ZIP that Discord gives you and explore your messaging and ussage history through interactive charts, user and server breakdowns, (experimental) sentiment analysis, and a Spotify-Wrapped-style recap. No data ever leaves your browser.

**Live site:** [https://disc-data-viewer.vercel.app/](https://disc-data-viewer.vercel.app/)

---

## Privacy

Your data package is **never uploaded** to the internet. All unzipping, parsing, statistics, and sentiment analysis, and etc. is run locally in your browser. The only outbound network requests the app ever makes are:

- `GET /api/discord-user?ids=…` whichresolves DM-recipient IDs to current usernames/avatars via a discord bot token.
- `/discord-cdn/*` — a proxy to `cdn.discordapp.com` so avatar images can load.

Neither sends your messages or statistics anywhere.

---

## Features

- **Interactive dashboard:** hourly and monthly message charts, totals, top channels, top servers, longest streaks, and most-messaged people.
- **Per-user & per-server search:** your activity with specific individuals or servers.
- **Discord Wrapped:** shareable story cards summarizing your year (totals, hours, top people, mood, words, streaks, personality, etc).
- **Achievements & personality:** badges and a computed personality profile based on your habits.
- **Sentiment analysis:** a fast lexicon-based mood scoring by default, or opt into AI sentiment (an in-browser RoBERTa model running on WebGPU) for far better handling of slang, sarcasm, and negation, at the cost of computation time.
- **Activity analytics:** counts reactions, voice joins, calls, and app opens from your analytics logs using a WebAssembly byte scanner. More analysis, such as amount of money spent, time spent on discord, and etc are planned.

---

## Getting your Discord data

In Discord: ``User Settings - Data & Privacy - Request all of my data (include every option)``. Discord emails you a download link, usually within a few days. The resulting `package.zip` is what you put into the viewer, **DO NOT** to unzip it first.

---

## Running locally


```bash
git clone https://github.com/Ardelerro/DIsc-Data-Viewer.git
cd DIsc-Data-Viewer
npm install
npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173`).

### Optional: DM-recipient enrichment

To resolve DM recipient IDs to live, realtime, usernames and avatars in dev, create a `.env` file with a Discord **bot** token:

```
DISCORD_BOT_TOKEN=your-bot-token
```

This is optional. without it, the `/api/discord-user` endpoint returns a 500 and DM recipients show as raw IDs and usernames/avatars stored in your package, but everything else works.