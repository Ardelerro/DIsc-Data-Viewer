import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type FC,
} from "react";
import JSZip from "jszip";

interface Self {
  id: string;
  username: string;
  avatar_hash?: string;
}

interface ChannelStats {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  recipientName?: string;
  averageGapBetweenMessages?: number;
  topWords?: string[];
  longestStreak?: number;
  streakStart?: string | null;
  streakEnd?: string | null;
}

interface ServerMapping {
  channelToServer: Record<string, string>;
  serverNames: Record<string, string>;
}

interface ProcessedData {
  self: Self;
  userMapping: Record<string, { username: string; avatar: string }>;
  channelMapping: Record<string, string>;
  channelNaming: Record<string, string>;
  channelManifest: string[];
  serverMapping: ServerMapping;
  aggregateStats: any;
  channelStats: Record<string, ChannelStats>;
  dmManifest: string[];
}

interface DataContextType {
  data: ProcessedData | null;
  isLoading: boolean;
  error: string | null;
  uploadData: (file: File) => Promise<void>;
  clearData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const STOP_WORDS = new Set([
  "i",
  "you",
  "me",
  "he",
  "she",
  "it",
  "we",
  "they",
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "to",
  "of",
  "in",
  "on",
  "for",
  "is",
  "am",
  "are",
  "was",
  "were",
  "be",
  "been",
  "this",
  "that",
  "these",
  "those",
  "my",
  "your",
  "his",
  "her",
  "their",
  "our",
  "at",
  "by",
  "with",
  "about",
  "as",
  "then",
  "do",
  "does",
  "did",
  "doing",
  "so",
  "than",
  "too",
  "very",
  "can",
  "will",
  "just",
  "dont",
  "didnt",
  "im",
  "ive",
  "youre",
  "hes",
  "shes",
  "theyre",
  "i've",
  "you're",
  "he's",
  "she's",
  "they're",
]);
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};

export const DataProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("discord-processed-data");
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to load stored data:", err);
        localStorage.removeItem("discord-processed-data");
      }
    }
  }, []);

  const uploadData = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const zip = await JSZip.loadAsync(file);

      const hasAccount = zip.file(/^Account\//i).length > 0;
      const hasMessages = zip.file(/^Messages\//i).length > 0;
      if (!hasAccount || !hasMessages) {
        throw new Error("Invalid package structure");
      }

      const processedData = await processZipData(zip);
      setData(processedData);

      localStorage.setItem(
        "discord-processed-data",
        JSON.stringify(processedData)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearData = () => {
    setData(null);
    localStorage.removeItem("discord-processed-data");
  };

  return (
    <DataContext.Provider
      value={{ data, isLoading, error, uploadData, clearData }}
    >
      {children}
    </DataContext.Provider>
  );
};
async function resolveUserName(
  zip: JSZip,
  userId: string
): Promise<string | null> {
  const user = await searchUserInUsersJson(zip, userId);
  return user?.username || null;
}

async function processZipData(zip: JSZip): Promise<ProcessedData> {
  const self = await extractSelfData(zip);
  const userMapping = await extractUserMapping(zip);
  const { channelMapping, channelNaming, channelManifest } =
    await processChannels(zip);
  const serverMapping = await processServers(zip);
  const { aggregateStats, channelStats, dmManifest } = await processMessages(
    zip,
    channelMapping,
    userMapping,
    self.id
  );

  return {
    self,
    userMapping,
    channelMapping,
    channelNaming,
    channelManifest,
    serverMapping,
    aggregateStats,
    channelStats,
    dmManifest,
  };
}

async function extractSelfData(zip: JSZip): Promise<Self> {
  const userFile = zip.file(/^Account\/user\.json$/i)[0];
  if (!userFile) throw new Error("Account/user.json not found");

  const content = await userFile.async("text");
  const data = JSON.parse(content);

  return {
    id: data.id,
    username: data.username,
    avatar_hash: data.avatar_hash || data.avatar,
  };
}

async function extractUserMapping(zip: JSZip) {
  const mapping: Record<string, { username: string; avatar: string }> = {};

  const userFile = zip.file(/^Account\/user\.json$/i)[0];
  if (userFile) {
    const content = await userFile.async("text");
    const data = JSON.parse(content);

    if (data.relationships) {
      for (const rel of data.relationships) {
        const u = rel.user;
        if (u?.id)
          mapping[u.id] = {
            username: u.username || "Unknown",
            avatar: u.avatar || "",
          };
      }
    }
  }

  const usersFile = zip.file(/^Account\/users\.json$/i)?.[0];
  if (usersFile) {
    const users = JSON.parse(await usersFile.async("text"));
    mergeUsers(mapping, users);
  }

  return mapping;
}

function mergeUsers(
  mapping: Record<string, { username: string; avatar: string }>,
  users: any
) {
  function recurse(obj: any) {
    if (!obj || typeof obj !== "object") return;
    if (obj.id && obj.username) {
      mapping[obj.id] = { username: obj.username, avatar: obj.avatar || "" };
    }
    for (const k in obj) recurse(obj[k]);
  }
  recurse(users);
}

async function processChannels(zip: JSZip) {
  const channelMapping: Record<string, string> = {};
  const channelNaming: Record<string, string> = {};
  const channelManifest: string[] = [];

  const channelFiles = zip.file(/^Messages\/c\d+\/channel\.json$/i);

  for (const channelFile of channelFiles) {
    try {
      const content = await channelFile.async("text");
      const channelData = JSON.parse(content);

      if (!channelData.id) continue;

      let type: "DM" | "GROUP_DM" | "GUILD_TEXT" = "GUILD_TEXT";
      if (channelData.type === "DM") type = "DM";
      else if (channelData.type === "GROUP_DM") type = "GROUP_DM";

      channelMapping[channelData.id] = type;

      if (channelData.name) {
        channelNaming[channelData.id] = channelData.name;
      }

      if (type === "GUILD_TEXT") {
        channelManifest.push(`channel_${channelData.id}.json`);
      }
    } catch (err) {
      console.warn(`Failed to process ${channelFile.name}:`, err);
    }
  }

  return { channelMapping, channelNaming, channelManifest };
}

async function processServers(zip: JSZip) {
  const serverMapping = {
    channelToServer: {} as Record<string, string>,
    serverNames: {} as Record<string, string>,
  };

  const channelFiles = zip.file(/^Messages\/c\d+\/channel\.json$/i);

  for (const channelFile of channelFiles) {
    try {
      const content = await channelFile.async("text");
      const channelData = JSON.parse(content);
      if (channelData.type === "GROUP_DM" || channelData.type === "DM")
        continue;

      if (channelData.guild && channelData.guild.id && channelData.guild.name) {
        serverMapping.channelToServer[channelData.id] = channelData.guild.id;
        serverMapping.serverNames[channelData.guild.id] =
          channelData.guild.name;
      }
    } catch (err) {
      console.warn(`Failed to process server data:`, err);
    }
  }

  return serverMapping;
}
async function processMessages(
  zip: JSZip,
  channelMapping: Record<string, string>,
  userMapping: Record<string, any>,
  yourId: string
) {
  const MESSAGE_GAP_THRESHOLD = 30;
  const MESSAGE_GAP_IGNORED = 259200;

  const aggregateStats = {
    hourly: {} as Record<string, number>,
    monthly: {} as Record<string, number>,
    topWords: [] as string[],
    totalGapTime: 0,
    numGaps: 0,
    messageCount: 0,
    averageGapBetweenMessages: 0,
  };

  const channelStats: Record<string, any> = {};
  const dmManifest: string[] = [];
  const globalWordFreq: Record<string, number> = {};
  const deletedUserCountMap: Record<string, number> = {};
  const usersJsonCache: Record<string, { username: string; avatar: string }> =
    {};

  const messageFiles = zip.file(/^Messages\/c\d+\/messages\.json$/i) || [];

  await Promise.all(
    messageFiles.map(async (messagesFile) => {
      try {
        const channelIdMatch = messagesFile.name.match(/c(\d+)/);
        if (!channelIdMatch) return;
        const channelId = channelIdMatch[1];
        const channelType = channelMapping[channelId];
        if (!channelType) return;

        const content = await messagesFile.async("text");
        const messages = JSON.parse(content);
        if (!Array.isArray(messages) || messages.length === 0) return;

        const stats: any = {
          hourly: {},
          monthly: {},
          totalGapTime: 0,
          numGaps: 0,
          messageCount: 0,
          averageGapBetweenMessages: 0,
        };

        const localWordFreq: Record<string, number> = {};
        const messageDates = new Set<string>();
        let prevMessageTime: number | null = null;

        messages.sort((a: any, b: any) => {
          const tA = a.Timestamp
            ? new Date(a.Timestamp.replace(" ", "T")).getTime()
            : 0;
          const tB = b.Timestamp
            ? new Date(b.Timestamp.replace(" ", "T")).getTime()
            : 0;
          return tA - tB;
        });

        for (const msg of messages) {
          if (!msg.Timestamp) continue;

          const timestamp = new Date(msg.Timestamp.replace(" ", "T"));
          if (isNaN(timestamp.getTime())) continue;

          const hour = timestamp.getHours().toString().padStart(2, "0");
          const month = `${timestamp.getFullYear()}-${(timestamp.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`;

          stats.hourly[hour] = (stats.hourly[hour] || 0) + 1;
          stats.monthly[month] = (stats.monthly[month] || 0) + 1;
          aggregateStats.hourly[hour] = (aggregateStats.hourly[hour] || 0) + 1;
          aggregateStats.monthly[month] =
            (aggregateStats.monthly[month] || 0) + 1;

          stats.messageCount++;
          aggregateStats.messageCount++;

          const currentTime = Math.floor(timestamp.getTime() / 1000);
          if (prevMessageTime !== null) {
            const gap = currentTime - prevMessageTime;
            if (gap > MESSAGE_GAP_THRESHOLD && gap < MESSAGE_GAP_IGNORED) {
              stats.totalGapTime += gap;
              stats.numGaps++;
              aggregateStats.totalGapTime += gap;
              aggregateStats.numGaps++;
            }
          }
          prevMessageTime = currentTime;

          messageDates.add(timestamp.toISOString().split("T")[0]);

          if (msg.Contents) {
            const words = msg.Contents.toLowerCase()
              .replace(/[^a-z0-9\s]/g, "")
              .split(/\s+/)
              .filter((word: string) => word && !STOP_WORDS.has(word));

            for (const word of words) {
              localWordFreq[word] = (localWordFreq[word] || 0) + 1;
              globalWordFreq[word] = (globalWordFreq[word] || 0) + 1;
            }
          }
        }

        stats.averageGapBetweenMessages =
          stats.numGaps > 0 ? stats.totalGapTime / stats.numGaps : 0;

        if (channelType === "DM") {
          const channelFile = zip.file(
            new RegExp(`^Messages/c${channelId}/channel\\.json$`, "i")
          )?.[0];
          if (channelFile) {
            const channelData = JSON.parse(await channelFile.async("text"));
            const recipientId =
              channelData.recipients?.find((r: string) => r !== yourId) ||
              "unknown";

            let recipientName =
              userMapping[recipientId]?.username ||
              (await resolveUserName(zip, recipientId)) ||
              "Unknown";

            if (recipientName === "Deleted User") {
              deletedUserCountMap[recipientName] =
                (deletedUserCountMap[recipientName] || 0) + 1;
              recipientName = `Deleted User${deletedUserCountMap[recipientName]}`;
            }

            stats.recipientName = recipientName;
            stats.topWords = getTopWords(localWordFreq, 5);
            const streak = calculateStreak(messageDates);
            stats.longestStreak = streak.length;
            stats.streakStart = streak.start;
            stats.streakEnd = streak.end;

            channelStats[`dm_${channelId}`] = stats;
            dmManifest.push(`dm_${channelId}.json`);
          }
        } else {
          const channelFile = zip.file(
            new RegExp(`^Messages/c${channelId}/channel\\.json$`, "i")
          )?.[0];
          if (channelFile) {
            const channelData = JSON.parse(await channelFile.async("text"));
            const channelName =
              channelData.name ||
              (channelType === "GROUP_DM" ? "Group DM" : "Unnamed Channel");

            stats.recipientName = channelName;
            stats.topWords = getTopWords(localWordFreq, 5);
            const streak = calculateStreak(messageDates);
            stats.longestStreak = streak.length;
            stats.streakStart = streak.start;
            stats.streakEnd = streak.end;

            channelStats[`channel_${channelId}`] = stats;
          }
        }
      } catch (err) {
        console.warn(
          `Failed processing messages for file: ${messagesFile.name}`,
          err
        );
      }
    })
  );

  aggregateStats.averageGapBetweenMessages =
    aggregateStats.numGaps > 0
      ? aggregateStats.totalGapTime / aggregateStats.numGaps
      : 0;
  aggregateStats.topWords = getTopWords(globalWordFreq, 5);

  return { aggregateStats, channelStats, dmManifest };
}

async function searchUserInUsersJson(
  zip: JSZip,
  userId: string
): Promise<{ username: string; avatar: string } | null> {
  const usersFile = zip.file(/^Account\/users\.json$/i)?.[0];
  if (!usersFile) return null;

  const content = await usersFile.async("text");
  let data: any;
  try {
    data = JSON.parse(content);
  } catch {
    return null;
  }

  function recursiveSearch(
    obj: any
  ): { username: string; avatar: string } | null {
    if (!obj || typeof obj !== "object") return null;
    if (obj.id === userId && obj.username) {
      return { username: obj.username, avatar: obj.avatar || "" };
    }
    for (const key of Object.keys(obj)) {
      const result = recursiveSearch(obj[key]);
      if (result) return result;
    }
    return null;
  }

  return recursiveSearch(data);
}

function getTopWords(freqMap: Record<string, number>, n: number): string[] {
  return Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word]) => word);
}

function calculateStreak(dates: Set<string>) {
  if (dates.size === 0) return { length: 0, start: null, end: null };

  const sorted = Array.from(dates).sort();
  let longest = 1,
    current = 1;
  let start = sorted[0],
    tempStart = start,
    end = start;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1]);
    const currDate = new Date(sorted[i]);
    const dayDiff = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff === 1) {
      current++;
      if (current > longest) {
        longest = current;
        start = tempStart;
        end = sorted[i];
      }
    } else {
      current = 1;
      tempStart = sorted[i];
    }
  }

  return { length: longest, start, end };
}
