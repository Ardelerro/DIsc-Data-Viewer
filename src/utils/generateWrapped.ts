import { toPng } from "html-to-image";
import type { WrappedCardData } from "../types/discord";





const W = 1080;
const H = 1920;


function avatarUrl(id: string, avatarHash?: string): string {
  if (id && avatarHash)
    return `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.png?size=256`;
  return `https://cdn.discordapp.com/embed/avatars/${Number(id) % 5}.png`;
}

function peakHour(hourly: Record<string, number> = {}): string {
  const entries = Object.entries(hourly);
  if (!entries.length) return "—";
  const [h] = entries.sort((a, b) => b[1] - a[1])[0];
  
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${ampm}`;
}

function peakHourCount(hourly: Record<string, number> = {}): number {
  const entries = Object.entries(hourly);
  if (!entries.length) return 0;
  return entries.sort((a, b) => b[1] - a[1])[0][1];
}

function peakMonth(monthly: Record<string, number> = {}): string {
  const entries = Object.entries(monthly);
  if (!entries.length) return "—";
  const [m] = entries.sort((a, b) => b[1] - a[1])[0];
  const [year, mon] = m.split("-");
  return new Date(Number(year), Number(mon) - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

function totalDaySpan(channelStats: WrappedCardData["channelStats"]): number {
  let min = Infinity,
    max = -Infinity;
  for (const key in channelStats) {
    for (const month in channelStats[key].monthly ?? {}) {
      const [y, mo] = month.split("-").map(Number);
      const t = new Date(y, mo - 1, 1).getTime();
      if (t < min) min = t;
      if (t > max) max = t;
    }
  }
  if (!isFinite(min) || !isFinite(max)) return 1;
  return Math.max(1, Math.round((max - min) / 86400000));
}

function topServer(
  serverStats?: WrappedCardData["serverStats"],
): { name: string; count: number } | null {
  if (!serverStats) return null;
  let best: { name: string; count: number } | null = null;
  for (const [, s] of Object.entries(serverStats)) {
    if (!best || s.messageCount > best.count)
      best = { name: s.name ?? "Unknown", count: s.messageCount };
  }
  return best;
}




function shell(
  bg: string,
  content: string,
  av: string,
  username: string,
): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Bebas+Neue&display=swap');
</style>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{width:${W}px;height:${H}px;overflow:hidden;background:transparent;}
.card{
  width:${W}px;height:${H}px;background:${bg};
  position:relative;font-family:'Space Grotesk',sans-serif;color:#fff;
}
.brand{
  position:absolute;bottom:0;left:0;right:0;
  padding:42px 72px;
  display:flex;align-items:center;justify-content:space-between;
}
.avatar{width:72px;height:72px;border-radius:50%;object-fit:cover;margin-right:18px;}
.fit-text{
  display:block;
  max-width:100%;
  word-break:break-word;
  overflow-wrap:anywhere;
}
</style>

<script>
(function () {

function fitTextBlock(el, maxSize, minSize, maxWidth, maxHeight) {
  if (!el) return;

  let size = maxSize;

  
  el.style.whiteSpace = "nowrap";
  el.style.fontSize = size + "px";
  el.style.maxWidth = maxWidth + "px";

  while (el.scrollWidth > maxWidth && size > minSize) {
    size -= 1;
    el.style.fontSize = size + "px";
  }

}

var CONTENT_W = 900;

function run() {
  fitTextBlock(document.getElementById("c1-total"), 280, 50, CONTENT_W-100, 400);
  fitTextBlock(document.getElementById("c1-summary"), 68, 28, CONTENT_W-100, 120);

  fitTextBlock(document.getElementById("c2-peak"), 252, 80, CONTENT_W-150, 300);
  fitTextBlock(document.getElementById("c2-peak-count"), 52, 28, CONTENT_W-150, 100);
  fitTextBlock(document.getElementById("c2-avg"), 185, 60, CONTENT_W-150, 220);

  fitTextBlock(document.getElementById("top-user-name"), 168, 0, CONTENT_W-50, 300);

  var RUNNER_W = CONTENT_W - 332;
  document.querySelectorAll(".runner-name").forEach(function(el) {
    fitTextBlock(el, 38, 20, RUNNER_W, 80);
  });

  document.querySelectorAll(".activity-value").forEach(function(el) {
    fitTextBlock(el, 86, 36, 500, 120);
  });

  fitTextBlock(document.getElementById("c5-month"), 145, 48, CONTENT_W, 240);
  fitTextBlock(document.getElementById("c5-server"), 112, 40, CONTENT_W, 200);
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(run);
} else {
  window.onload = run;
}

})();
</script>
</head><body>
<div class="card" id="card">
${content}
<div class="brand">
  <span>disc-data-viewer</span>
  <span style="display:flex;align-items:center;">
    <img src="${av}" class="avatar"/>
    ${username}
  </span>
</div>
</div>
</body></html>`;
}


function card1(data: WrappedCardData, av: string): string {
  const total = data.aggregateStats.messageCount ?? 0;
  const days = totalDaySpan(data.channelStats);
  const years = (days / 365).toFixed(1);

  const words: string[] = (data.aggregateStats as any).topWords ?? [];
  const cloudWords = words.slice(0, 40);

  const sizes = cloudWords.map((_, i) => {
    if (i === 0) return 88;
    if (i < 3) return 68;
    if (i < 8) return 52;
    if (i < 16) return 40;
    if (i < 28) return 30;
    return 22;
  });

  const colors = [
    "#ffffff", "#c7d2fe", "#a5b4fc", "#818cf8",
    "#93c5fd", "#6ee7b7", "#fde68a", "#f9a8d4",
  ];

  const wordDataJson = JSON.stringify(
    cloudWords.map((w, i) => ({ w, s: sizes[i], c: colors[i % colors.length] }))
  );

  const content = `
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,#5865F2 0%,#3b2fcb 60%,#1a1240 100%);"></div>
    <div style="position:absolute;top:-180px;right:-180px;width:860px;height:860px;border-radius:50%;border:2px solid rgba(255,255,255,0.06);pointer-events:none;"></div>
    <div style="position:absolute;top:-90px;right:-90px;width:630px;height:630px;border-radius:50%;border:2px solid rgba(255,255,255,0.1);pointer-events:none;"></div>

    <!-- Top: total count -->
    <div style="position:absolute;top:100px;left:90px;right:90px;">
      <div style="font-size:22px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.5;margin-bottom:10px;">Your Discord, all of it</div>
      <div id="c1-total" class="fit-text" style="font-family:'Bebas Neue',sans-serif;font-size:200px;line-height:0.88;letter-spacing:-4px;">${total.toLocaleString()}</div>
      <div id="c1-summary" class="fit-text" style="font-size:52px;font-weight:700;margin-top:14px;opacity:0.72;">messages sent</div>
    </div>

    <!-- Word cloud in the middle -->
    <canvas id="wordcloud-canvas" style="position:absolute;left:0;right:0;top:480px;width:1080px;height:1100px;"></canvas>

    <!-- Bottom -->
    <div style="position:absolute;bottom:160px;left:90px;right:90px;">
      <div style="width:110px;height:4px;background:rgba(255,255,255,0.3);margin-bottom:28px;border-radius:2px;"></div>
      <div style="font-size:32px;opacity:0.55;line-height:1.6;">
        Over <strong style="opacity:1;color:#fff;">${days.toLocaleString()} days</strong> —
        that's roughly <strong style="opacity:1;color:#fff;">${years} years</strong> of history.
      </div>
    </div>

    <script>
    (function() {
      var words = ${wordDataJson};
      var canvas = document.getElementById('wordcloud-canvas');
      if (!canvas || !words.length) return;
      var CW = 1080, CH = 1100;
      canvas.width = CW;
      canvas.height = CH;
      var ctx = canvas.getContext('2d');

      var placed = []; // {x,y,w,h}[]

      function overlaps(x, y, w, h) {
        var pad = 10;
        for (var i = 0; i < placed.length; i++) {
          var p = placed[i];
          if (x < p.x + p.w + pad && x + w + pad > p.x &&
              y < p.y + p.h + pad && y + h + pad > p.y) return true;
        }
        return false;
      }

      var cx = CW / 2, cy = CH / 2;

      function tryPlace(word, size, color) {
        ctx.font = 'bold ' + size + 'px "Space Grotesk", sans-serif';
        var tw = ctx.measureText(word).width;
        var th = size * 1.2;

        for (var r = 0; r < 500; r += 2) {
          var steps = Math.max(1, Math.round(2 * Math.PI * r / 18));
          for (var step = 0; step < steps; step++) {
            var angle = (step / steps) * 2 * Math.PI + (r * 0.15);
            var ox = r * Math.cos(angle);
            var oy = r * Math.sin(angle) * 0.7;
            var x = cx + ox - tw / 2;
            var y = cy + oy;

            if (x < 20 || x + tw > CW - 20 || y - th < 20 || y > CH - 20) continue;

            if (!overlaps(x, y - th, tw, th)) {
              placed.push({x: x, y: y - th, w: tw, h: th});
              ctx.globalAlpha = 0.92;
              ctx.fillStyle = color;
              ctx.fillText(word, x, y);
              return true;
            }
          }
        }
        return false;
      }

      document.fonts.ready.then(function() {
        placed = [];
        for (var i = 0; i < words.length; i++) {
          tryPlace(words[i].w, words[i].s, words[i].c);
        }
      });
    })();
    </script>`;

  return shell("transparent", content, av, data.self.username);
}


function card2(data: WrappedCardData, av: string): string {
  const peak = peakHour(data.aggregateStats.hourly);
  const numPeak = peakHourCount(data.aggregateStats.hourly);
  const days = totalDaySpan(data.channelStats);
  const avg = (data.aggregateStats.messageCount / days).toFixed(1);

  const content = `
    <div style="position:absolute;inset:0;background:#0d0d0d;"></div>
    <div style="position:absolute;top:0;left:0;right:0;height:14px;background:linear-gradient(90deg,#00b4d8,#5865F2,#ff6b6b);"></div>

    <div style="position:absolute;top:120px;left:90px;right:90px;">
      <div style="font-size:24px;letter-spacing:0.22em;text-transform:uppercase;color:#00b4d8;margin-bottom:64px;">When you're most active</div>

      <div style="margin-bottom:90px;">
        <div style="font-size:28px;opacity:0.4;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.1em;">Peak hour</div>
        <div id="c2-peak" class="fit-text" style="font-family:'Bebas Neue',sans-serif;font-size:252px;line-height:0.88;color:#00b4d8;">${peak}</div>
        <div id="c2-peak-count" class="fit-text" style="font-family:'Bebas Neue',sans-serif;font-size:52px;line-height:0.88;color:#00b4d8;">${numPeak.toLocaleString()} messages sent</div>
      </div>

      <div style="width:100%;height:2px;background:rgba(255,255,255,0.08);margin-bottom:90px;"></div>

      <div>
        <div style="font-size:28px;opacity:0.4;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.1em;">Daily average</div>
        <div id="c2-avg" class="fit-text" style="font-family:'Bebas Neue',sans-serif;font-size:185px;line-height:0.88;color:#fff;">
          ${avg}<span style="font-size:74px;opacity:0.5;"> msgs</span>
        </div>
      </div>
    </div>

    <div style="position:absolute;bottom:160px;left:90px;right:90px;font-size:32px;opacity:0.3;line-height:1.5;">
      Consistent. Every single day.
    </div>`;
  return shell("transparent", content, av, data.self.username);
}


function card3(data: WrappedCardData, av: string): string {
  const top = data.topUsers?.[0];
  if (!top) return card4(data, av);
  const runners = data.topUsers?.slice(1, 10) ?? [];

  const content = `
    <div style="position:absolute;inset:0;background:linear-gradient(155deg,#1a0533 0%,#2d1b69 50%,#0d0d0d 100%);"></div>
    <div style="position:absolute;top:-44px;right:44px;font-family:'Bebas Neue',sans-serif;font-size:740px;color:rgba(255,255,255,0.03);line-height:1;user-select:none;">#1</div>

    <div style="position:absolute;top:130px;left:90px;right:90px;">
      <div style="font-size:24px;letter-spacing:0.22em;text-transform:uppercase;color:#a78bfa;margin-bottom:80px;">Your #1 person</div>

      <div id="top-user-name" class="fit-text"
          style="font-family:'Bebas Neue',sans-serif;font-size:168px;line-height:0.92;margin-bottom:18px;max-width:100%;">
        ${top.username}
      </div>
      <div style="font-size:42px;opacity:0.48;margin-bottom:110px;">${top.messageCount.toLocaleString()} messages together</div>

      <div style="width:100%;height:2px;background:rgba(255,255,255,0.08);margin-bottom:64px;"></div>

      ${runners
        .map(
          (u, i) => `
        <div style="display:flex;align-items:center;margin-bottom:42px;">
          <span style="font-family:'Bebas Neue',sans-serif;font-size:52px;color:rgba(255,255,255,0.22);width:108px;flex-shrink:0;">#${i + 2}</span>
          <span class="runner-name fit-text" style="font-size:38px;font-weight:500;flex:1;overflow:hidden;">${u.username}</span>
          <span style="font-size:32px;opacity:0.38;flex-shrink:0;padding-left:24px;width:200px;text-align:right;">${u.messageCount.toLocaleString()}</span>
        </div>`,
        )
        .join("")}
    </div>`;
  return shell("transparent", content, av, data.self.username);
}


function card4(data: WrappedCardData, av: string): string {
  const acts = data.activityStats;
  const reactions = acts?.addReaction ?? 0;
  const voice = acts?.joinVoice ?? 0;
  const attachments = acts?.attachmentsSent ?? 0;
  const calls = (acts?.joinCall ?? 0) + (acts?.startCall ?? 0);

  const row = (label: string, value: number, color: string) => `
    <div style="display:flex;align-items:flex-end;justify-content:space-between;padding:38px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="font-size:34px;opacity:0.55;flex-shrink:0;padding-right:24px;">${label}</span>
      <span class="activity-value fit-text" style="font-family:'Bebas Neue',sans-serif;font-size:86px;color:${color};line-height:1;">${value.toLocaleString()}</span>
    </div>`;

  const content = `
    <div style="position:absolute;inset:0;background:#0f0f0f;"></div>
    <div style="position:absolute;top:0;left:0;right:0;height:14px;background:#57F287;"></div>

    <div style="position:absolute;top:120px;left:90px;right:90px;">
      <div style="font-size:24px;letter-spacing:0.22em;text-transform:uppercase;color:#57F287;margin-bottom:72px;">Beyond the messages</div>
      ${row("Reactions given", reactions, "#fbbf24")}
      ${row("Voice sessions", voice, "#60a5fa")}
      ${row("Attachments sent", attachments, "#f472b6")}
      ${row("Calls joined or started", calls, "#34d399")}
    </div>`;
  return shell("transparent", content, av, data.self.username);
}


function card5(data: WrappedCardData, av: string): string {
  const month = peakMonth(data.aggregateStats.monthly);
  const server = topServer(data.serverStats);

  const content = `
    <div style="position:absolute;inset:0;background:linear-gradient(165deg,#EB459E 0%,#7b2d64 50%,#0d0d0d 100%);"></div>
    <div style="position:absolute;bottom:180px;left:-44px;font-family:'Bebas Neue',sans-serif;font-size:590px;color:rgba(0,0,0,0.12);line-height:1;user-select:none;white-space:nowrap;">PEAK</div>

    <div style="position:absolute;top:130px;left:90px;right:90px;">
      <div style="font-size:24px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.5;margin-bottom:64px;">Your biggest month</div>
      <div id="c5-month" class="fit-text" style="font-family:'Bebas Neue',sans-serif;font-size:145px;line-height:0.92;margin-bottom:110px;">${month}</div>

      <div style="width:110px;height:4px;background:rgba(255,255,255,0.3);margin-bottom:80px;border-radius:2px;"></div>

      ${
        server
          ? `
        <div style="font-size:24px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.5;margin-bottom:28px;">Top server</div>
        <div id="c5-server" class="fit-text" style="font-family:'Bebas Neue',sans-serif;font-size:112px;line-height:0.92;margin-bottom:14px;">${server.name}</div>
        <div style="font-size:34px;opacity:0.42;">${server.count.toLocaleString()} messages</div>
      `
          : ""
      }
    </div>`;
  return shell("transparent", content, av, data.self.username);
}


export interface WrappedCard {
  id: string;
  label: string;
  buildHTML: (data: WrappedCardData, av: string) => string;
  bg: string;
}

export const WRAPPED_CARDS: WrappedCard[] = [
  { id: "messages", label: "Total Messages", buildHTML: card1, bg: "#5865F2" },
  { id: "timing", label: "Peak Hour", buildHTML: card2, bg: "#00b4d8" },
  { id: "friends", label: "Top Friend", buildHTML: card3, bg: "#a78bfa" },
  { id: "activity", label: "Activity", buildHTML: card4, bg: "#57F287" },
  { id: "peak", label: "Biggest Month", buildHTML: card5, bg: "#EB459E" },
];




async function captureCard(
  html: string,
  mode: "preview" | "download",
): Promise<string> {
  const pixelRatio = mode === "download" ? 4 : 2; 
  const settleMs = mode === "download" ? 1400 : 1000;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = `
    position:fixed;top:-9999px;left:-9999px;
    width:${W}px;height:${H}px;
    border:none;pointer-events:none;z-index:-1;
  `;
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((res) => {
    if (iframe.contentWindow?.document.readyState === "complete") res();
    else iframe.addEventListener("load", () => res(), { once: true });
  });
  await new Promise((r) => setTimeout(r, settleMs));

  const el = doc.getElementById("card");
  if (!el) {
    document.body.removeChild(iframe);
    throw new Error("generateWrapped: #card element not found");
  }

  const dataUrl = await toPng(el, {
    width: W,
    height: H,
    pixelRatio,
    backgroundColor: undefined,
    fetchRequestInit: { mode: "cors" },
  });

  document.body.removeChild(iframe);
  return dataUrl;
}



export async function previewAllCards(
  data: WrappedCardData,
): Promise<Array<{ id: string; label: string; bg: string; dataUrl: string }>> {
  //console.log(data);
  const av = avatarUrl(data.self.id, data.self.avatar_hash);
  const results = [];
  for (const card of WRAPPED_CARDS) {
    const dataUrl = await captureCard(card.buildHTML(data, av), "preview");
    results.push({ id: card.id, label: card.label, bg: card.bg, dataUrl });
  }
  return results;
}

export async function downloadWrappedCard(
  data: WrappedCardData,
  cardId: string,
  filename?: string,
): Promise<void> {
  const card = WRAPPED_CARDS.find((c) => c.id === cardId);
  if (!card) throw new Error(`Unknown card id: ${cardId}`);
  const av = avatarUrl(data.self.id, data.self.avatar_hash);
  const dataUrl = await captureCard(card.buildHTML(data, av), "download");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename ?? `discord-wrapped-${cardId}.png`;
  a.click();
}

export async function generateWrappedCard(
  data: WrappedCardData,
  filename = "discord-wrapped.png",
): Promise<void> {
  return downloadWrappedCard(data, "messages", filename);
}