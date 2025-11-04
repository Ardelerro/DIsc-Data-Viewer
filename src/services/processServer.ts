import type JSZip from "jszip";


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
        const guildId = channelData.guild.id;
        const guildName = channelData.guild.name.trim();

        if (!guildId || !guildName) continue;
        if (guildName.toLowerCase() !== "unknown") {
          serverMapping.channelToServer[channelData.id] = guildId;
          serverMapping.serverNames[guildId] = guildName;
        }
      }
    } catch (err) {
      console.warn(`Failed to process server data:`, err);
    }
  }

  return serverMapping;
}

export { processServers };