import type JSZip from "jszip";
import type { ProcessedData, Self } from "../types/discord";
import { processMessages } from "./messageProcessor";
import { map } from "../utils/progressUtils";
import { processServers } from "./processServer";

async function processZipData(
  zip: JSZip,
  onProgress?: (progress: number) => void,
): Promise<ProcessedData> {
  let stageProgress = 0;
  const update = (inc: number) => {
    stageProgress = Math.min(100, stageProgress + inc);
    onProgress?.(stageProgress);
  };

  const [self, userMapping] = await Promise.all([
    extractSelfData(zip),
    extractUserMapping(zip),
  ]);
  update(1);

  const [serverMapping, {
    aggregateStats,
    channelStats,
    channelMapping,
    channelNaming,
    channelManifest,
    dmManifest,
  }] = await Promise.all([
    processServers(zip),
    processMessages(
      zip,
      userMapping,
      self.id,
      (msgProgress: number) => {
        update(map(msgProgress, 0, 100, 0, 99));
      },
    ),
  ]);

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
    activityStats: {
      addReaction: 0,
      attachmentsSent: 0,
      joinVoice: 0,
      startCall: 0,
      joinCall: 0,
      appOpened: 0,
    },
  };
}

async function extractSelfData(zip: JSZip): Promise<Self> {
  const userFile = zip.file(/^Account\/user\.json$/i)[0];
  if (!userFile) throw new Error("Account/user.json not found");
  const data = JSON.parse(await userFile.async("text"));
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
    const data = JSON.parse(await userFile.async("text"));
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
  users: any,
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

export { processZipData };