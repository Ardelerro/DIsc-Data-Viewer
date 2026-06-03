import {
  BlobReader,
  ZipReader,
  TextWriter,
  configure,
  type FileEntry,
} from "@zip.js/zip.js";
import type {
  AggregateStats,
  PartialAgg,
  ChannelStats,
  ProcessedData,
  Self,
  MessageWorkerResponse,
} from "../types/discord";
import { getTopWords } from "../utils/textUtils";
import { Profiler } from "./profiler";
import { enrichUserMapping } from "./discordUser";
import { getDeviceTuning } from "../utils/deviceProfile";
import MessageWorker from "./messages.worker.ts?worker";

configure({ useWebWorkers: true });
const WORKER_SILENCE_TIMEOUT_MS = 60_000;

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  if (!Number.isFinite(limit) || limit >= items.length) {
    await Promise.all(items.map(fn));
    return;
  }
  let next = 0;
  const run = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(
    Array.from({ length: Math.max(1, limit) }, () => run()),
  );
}

async function processZipData(
  file: File | Blob,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
  aiMode = false,
  prof: Profiler = new Profiler(),
  onEnriched?: () => void,
): Promise<Omit<ProcessedData, "activityStats">> {
  const zp = new Profiler();
  const tuning = getDeviceTuning();
  const reader = new ZipReader(new BlobReader(file));
  const entries = await zp.timeAsync("getEntries", () => reader.getEntries());

  const channelEntries: FileEntry[] = [];
  const messageEntries: FileEntry[] = [];
  let userEntry: FileEntry | undefined;
  let usersEntry: FileEntry | undefined;

  for (const e of entries) {
    if (e.directory) continue;
    const fe = e as FileEntry;
    if (/^Account\/user\.json$/i.test(fe.filename)) {
      userEntry = fe;
    } else if (/^Account\/users\.json$/i.test(fe.filename)) {
      usersEntry = fe;
    } else if (/^Messages\/c\d+\/channel\.json$/i.test(fe.filename)) {
      channelEntries.push(fe);
    } else if (/^Messages\/c\d+\/messages\.json$/i.test(fe.filename)) {
      messageEntries.push(fe);
    }
  }

  if (
    !userEntry ||
    (channelEntries.length === 0 && messageEntries.length === 0)
  ) {
    await reader.close();
    throw new Error("Invalid package structure");
  }

  const [self, userMapping] = await zp.timeAsync("extractAccountData", () =>
    extractAccountData(userEntry!, usersEntry),
  );

  const channelMapping: Record<string, string> = {};
  const channelNaming: Record<string, string> = {};
  const channelRecipients: Record<string, string[]> = {};
  const channelToServer: Record<string, string> = {};
  const serverNames: Record<string, string> = {};

  const stopChannelPass = zp.start("channelJsonPass");
  await runWithConcurrency(
    channelEntries,
    tuning.channelPassConcurrency,
    async (entry) => {
      try {
        const text = await entry.getData(new TextWriter());
        const data = JSON.parse(text);
        if (!data?.id) return;

        let type:
          | "DM"
          | "GROUP_DM"
          | "GUILD_TEXT"
          | "GUILD_VOICE"
          | "PUBLIC_THREAD" = "GUILD_TEXT";
        if (data.type === "DM") type = "DM";
        else if (data.type === "GROUP_DM") type = "GROUP_DM";
        else if (data.type === 13) type = "PUBLIC_THREAD";
        else if (data.type === "GUILD_VOICE") type = "GUILD_VOICE";

        channelMapping[data.id] = type;
        if (data.name) channelNaming[data.id] = data.name;

        if (Array.isArray(data.recipients)) {
          channelRecipients[data.id] = data.recipients;
        }

        if (type !== "DM" && type !== "GROUP_DM") {
          const guild = data.guild;
          if (guild?.id && guild?.name) {
            const name = String(guild.name).trim();
            if (name && name.toLowerCase() !== "unknown") {
              channelToServer[data.id] = guild.id;
              serverNames[guild.id] = name;
            }
          }
        }
      } catch (err) {
        console.warn("Failed to parse channel.json", err);
      }
    },
  );
  stopChannelPass();

  
  
  
  
  const recipientIds: string[] = [];
  const seenRecipients = new Set<string>();
  for (const [channelId, recips] of Object.entries(channelRecipients)) {
    if (channelMapping[channelId] !== "DM") continue;
    for (const r of recips) {
      if (r === self.id || r === "unknown" || seenRecipients.has(r)) continue;
      seenRecipients.add(r);
      recipientIds.push(r);
    }
  }
  let flushNames: () => void = () => {};
  const enrichPromise = enrichUserMapping(
    self,
    userMapping,
    recipientIds,
    signal,
    () => flushNames(),
  );

  await reader.close();
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  onProgress?.(3);

  const aggregateStats: AggregateStats = {
    hourly: {},
    monthly: {},
    daily: {},
    dailyHourly: {},
    topWords: [],
    totalGapTime: 0,
    numGaps: 0,
    messageCount: 0,
    averageGapBetweenMessages: 0,
    averageConversationTime: 0,
    longestConversationTime: 0,
    hourlySentimentTotal: {},
    hourlySentimentAverage: {},
    usersPerDay: {},
  };
  const globalWordFreq: Record<string, number> = {};
  const globalHourlyAnalyzed: Record<string, number> = {};
  const channelStats: Record<string, ChannelStats> = {};

  const messageFilenames = messageEntries.map((e) => e.filename);
  const totalFiles = messageFilenames.length;

  if (totalFiles > 0) {
    const sizeByName = new Map<string, number>();
    for (const e of messageEntries) {
      sizeByName.set(e.filename, e.uncompressedSize || 0);
    }
    const queue = messageFilenames
      .slice()
      .sort((a, b) => (sizeByName.get(b) || 0) - (sizeByName.get(a) || 0));
    let totalBytes = 0;
    for (const s of sizeByName.values()) totalBytes += s;
    if (totalBytes <= 0) totalBytes = 1;

    let qi = 0;
    let processedBytes = 0;
    let lastReported = -1;
    const reportProgress = () => {
      const pct = (processedBytes / totalBytes) * 100;

      const intPct = pct | 0;
      if (intPct === lastReported) return;
      lastReported = intPct;

      onProgress?.(3 + pct * 0.95);
    };

    const workerCount = Math.min(tuning.maxWorkers, totalFiles);

    const stopPool = zp.start("workerPool:wall");
    await Promise.all(
      Array.from(
        { length: workerCount },
        () =>
          new Promise<void>((resolve, reject) => {
            const worker = new MessageWorker();
            let done = false;
            let watchdog: ReturnType<typeof setTimeout>;

            const cleanup = () => {
              clearTimeout(watchdog);
              signal?.removeEventListener("abort", onAbort);
            };
            const fail = (err: Error) => {
              if (done) return;
              done = true;
              cleanup();
              worker.terminate();
              reject(err);
            };
            const armWatchdog = () => {
              clearTimeout(watchdog);
              watchdog = setTimeout(() => {
                fail(
                  new Error(
                    `Message worker stalled for ${
                      WORKER_SILENCE_TIMEOUT_MS / 1000
                    }s — the device likely ran out of memory while processing ` +
                      `this export. Try a desktop browser or the precomputed-JSON path.`,
                  ),
                );
              }, WORKER_SILENCE_TIMEOUT_MS);
            };

            const onAbort = () =>
              fail(new DOMException("Aborted", "AbortError") as unknown as Error);
            if (signal) {
              if (signal.aborted) {
                onAbort();
                return;
              }
              signal.addEventListener("abort", onAbort, { once: true });
            }

            worker.onmessage = (ev: MessageEvent<MessageWorkerResponse>) => {
              const m = ev.data;
              if (!m || done) return;
              armWatchdog();
              if (m.type === "idle") {
                if (qi < queue.length) {
                  worker.postMessage({ type: "file", filename: queue[qi++] });
                } else {
                  worker.postMessage({ type: "stop" });
                }
              } else if (m.type === "progress") {
                processedBytes += m.bytes;
                reportProgress();
              } else if (m.type === "error") {
                console.error("Message worker reported failure:", m.message);
                fail(new Error(m.message));
              } else if (m.type === "result") {
                mergeAggregate(
                  aggregateStats,
                  globalWordFreq,
                  globalHourlyAnalyzed,
                  m.agg,
                );
                for (const { channelId, stats } of m.channels) {
                  const type = channelMapping[channelId];
                  if (!type) continue;
                  const key =
                    type === "DM" ? `dm_${channelId}` : `channel_${channelId}`;
                  channelStats[key] = stats;
                }

                zp.merge(m.profile, "msgworker/");
                done = true;
                cleanup();
                worker.terminate();
                resolve();
              }
            };
            worker.onerror = (err) => {
              console.error("Message worker error", err);
              fail(new Error(err.message || "Message worker crashed"));
            };
            armWatchdog();
            worker.postMessage({
              type: "init",
              file,
              channelMapping,
              aiMode,
              streamThresholdBytes: tuning.streamThresholdBytes,
            });
          }),
      ),
    );
    stopPool();
  }

  const stopFinalize = zp.start("finalize(naming+topWords)");

  const dmManifest: string[] = [];
  const channelManifest: string[] = [];
  for (const filename of messageFilenames) {
    const m = filename.match(/c(\d+)/);
    if (!m) continue;
    const channelId = m[1];
    const type = channelMapping[channelId];
    if (!type) continue;
    const key = type === "DM" ? `dm_${channelId}` : `channel_${channelId}`;
    const stats = channelStats[key];
    if (!stats) continue;

    if (type === "DM") {
      const recipients = channelRecipients[channelId];
      stats.recipientId =
        recipients?.find((r: string) => r !== self.id) ?? "unknown";
      dmManifest.push(`dm_${channelId}.json`);
    } else {
      stats.recipientName =
        channelNaming[channelId] ||
        (type === "GROUP_DM"
          ? `Group DM (${channelId})`
          : `Unnamed Channel (${channelId})`);
      channelManifest.push(`channel_${channelId}.json`);
    }
  }

  flushNames = () => {
    applyDmRecipientNames(channelStats, dmManifest, userMapping);
    onEnriched?.();
  };
  flushNames();

  void enrichPromise.catch((err: unknown) => {
    if (err instanceof DOMException && err.name === "AbortError") return;
    console.warn(
      "Background user enrichment failed; keeping current names:",
      err,
    );
  });

  if (Object.keys(globalWordFreq).length > 5000) {
    for (const k in globalWordFreq) {
      if (globalWordFreq[k] <= 1) delete globalWordFreq[k];
    }
  }

  aggregateStats.averageGapBetweenMessages =
    aggregateStats.numGaps > 0
      ? aggregateStats.totalGapTime / aggregateStats.numGaps
      : 0;
  aggregateStats.topWords = getTopWords(globalWordFreq, 50);
  for (const hour in aggregateStats.hourly) {
    const total = aggregateStats.hourlySentimentTotal[hour] || 0;
    const an = globalHourlyAnalyzed[hour] || 0;
    aggregateStats.hourlySentimentAverage[hour] = an > 0 ? total / an : 0;
  }

  stopFinalize();
  prof.merge(zp.export(), "zip/");
  onProgress?.(100);

  return {
    self,
    userMapping,
    channelMapping,
    channelNaming,
    channelManifest,
    serverMapping: { channelToServer, serverNames },
    aggregateStats,
    channelStats,
    dmManifest,
  };
}

function mergeAggregate(
  target: AggregateStats,
  globalWordFreq: Record<string, number>,
  globalHourlyAnalyzed: Record<string, number>,
  src: PartialAgg,
) {
  for (const k in src.hourly) {
    target.hourly[k] = (target.hourly[k] || 0) + src.hourly[k];
  }
  for (const k in src.monthly) {
    target.monthly[k] = (target.monthly[k] || 0) + src.monthly[k];
  }
  if (target.daily) {
    for (const k in src.daily) {
      target.daily[k] = (target.daily[k] || 0) + src.daily[k];
    }
  }
  if (target.dailyHourly) {
    for (const date in src.dailyHourly) {
      const srcRow = src.dailyHourly[date];
      const tgtRow =
        target.dailyHourly[date] || (target.dailyHourly[date] = {});
      for (const h in srcRow) {
        tgtRow[h] = (tgtRow[h] || 0) + srcRow[h];
      }
    }
  }
  for (const k in src.hourlySentimentTotal) {
    target.hourlySentimentTotal[k] =
      (target.hourlySentimentTotal[k] || 0) + src.hourlySentimentTotal[k];
  }
  for (const k in src.hourlyAnalyzedCount) {
    globalHourlyAnalyzed[k] =
      (globalHourlyAnalyzed[k] || 0) + src.hourlyAnalyzedCount[k];
  }
  for (const k in src.globalWordFreq) {
    globalWordFreq[k] = (globalWordFreq[k] || 0) + src.globalWordFreq[k];
  }
  target.totalGapTime += src.totalGapTime;
  target.numGaps += src.numGaps;
  target.messageCount += src.messageCount;
}

function applyDmRecipientNames(
  channelStats: Record<string, ChannelStats>,
  dmManifest: string[],
  userMapping: Record<string, { username: string; avatar: string }>,
): void {
  let deletedUsers = 0;
  for (const manifest of dmManifest) {
    const stats = channelStats[manifest.replace(/\.json$/, "")];
    const recipientId = stats?.recipientId;
    if (!recipientId) continue;
    let name = userMapping[recipientId]?.username ?? `Unknown (${recipientId})`;
    if (name === "Deleted User") name = `Deleted User${++deletedUsers}`;
    stats.recipientName = name;
  }
}

function namesSignature(data: ProcessedData): string {
  const dm: Record<string, string> = {};
  for (const key in data.channelStats) {
    if (!key.startsWith("dm_")) continue;
    const s = data.channelStats[key];
    dm[key] = `${s.recipientId ?? ""}|${s.recipientName ?? ""}`;
  }
  return JSON.stringify([data.self, data.userMapping, dm]);
}

async function refreshUserNames(
  data: ProcessedData,
  signal?: AbortSignal,
  onUpdate?: () => void,
): Promise<boolean> {
  const before = namesSignature(data);

  
  
  
  const byActivity: { id: string; count: number }[] = [];
  const seen = new Set<string>();
  for (const key in data.channelStats) {
    if (!key.startsWith("dm_")) continue;
    const stats = data.channelStats[key];
    if (!stats.recipientId) {
      const m = stats.recipientName?.match(/^Unknown \((\d+)\)$/);
      if (m) stats.recipientId = m[1];
    }
    const rid = stats.recipientId;
    if (!rid || rid === "unknown" || seen.has(rid)) continue;
    seen.add(rid);
    const count =
      stats.messageCount ??
      Object.values(stats.hourly).reduce((sum, c) => sum + c, 0);
    byActivity.push({ id: rid, count });
  }
  byActivity.sort((a, b) => b.count - a.count);
  const recipientIds = byActivity.map((e) => e.id);

  await enrichUserMapping(
    data.self,
    data.userMapping,
    recipientIds,
    signal,
    () => {
      applyDmRecipientNames(data.channelStats, data.dmManifest, data.userMapping);
      onUpdate?.();
    },
  );
  applyDmRecipientNames(data.channelStats, data.dmManifest, data.userMapping);

  return namesSignature(data) !== before;
}

async function extractAccountData(
  userEntry: FileEntry,
  usersEntry: FileEntry | undefined,
): Promise<[Self, Record<string, { username: string; avatar: string }>]> {
  const userText = await userEntry.getData(new TextWriter());
  const userData = JSON.parse(userText);
  const self: Self = {
    id: userData.id,
    username: userData.username,
    avatar_hash: userData.avatar_hash || userData.avatar,
  };

  const mapping: Record<string, { username: string; avatar: string }> = {};
  if (Array.isArray(userData.relationships)) {
    for (const rel of userData.relationships) {
      const u = rel?.user;
      if (u?.id) {
        mapping[u.id] = {
          username: u.username || "Unknown",
          avatar: u.avatar || "",
        };
      }
    }
  }

  if (usersEntry) {
    try {
      const text = await usersEntry.getData(new TextWriter());
      mergeUsers(mapping, JSON.parse(text));
    } catch (err) {
      console.warn("Failed to parse users.json", err);
    }
  }

  return [self, mapping];
}

function mergeUsers(
  mapping: Record<string, { username: string; avatar: string }>,
  users: any,
) {
  const stack: any[] = [users];
  while (stack.length) {
    const obj = stack.pop();
    if (!obj || typeof obj !== "object") continue;
    if (obj.id && obj.username) {
      mapping[obj.id] = {
        username: obj.username,
        avatar: obj.avatar || "",
      };
    }
    for (const k in obj) {
      const v = obj[k];
      if (v && typeof v === "object") stack.push(v);
    }
  }
}

export { processZipData, refreshUserNames };
