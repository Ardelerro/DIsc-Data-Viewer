import type JSZip from "jszip";

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

      let type:
        | "DM"
        | "GROUP_DM"
        | "GUILD_TEXT"
        | "GUILD_VOICE"
        | "PUBLIC_THREAD" = "GUILD_TEXT";
      if (channelData.type === "DM") type = "DM";
      else if (channelData.type === "GROUP_DM") type = "GROUP_DM";
      else if (channelData.type === 13) type = "PUBLIC_THREAD";
      else if (channelData.type === "GUILD_VOICE") type = "GUILD_VOICE";

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

export { processChannels };