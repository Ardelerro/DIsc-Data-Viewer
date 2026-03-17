import type JSZip from "jszip";

async function processServers(zip: JSZip) {
  const channelToServer: Record<string, string> = {};
  const serverNames: Record<string, string> = {};

  const channelFiles = zip.file(/^Messages\/c\d+\/channel\.json$/i);

  await Promise.all(channelFiles.map(async (channelFile) => {
    try {
      const content = await channelFile.async("text");
      const channelData = JSON.parse(content);
      if (channelData.type === "GROUP_DM" || channelData.type === "DM") return;
      const guild = channelData.guild;
      if (!guild?.id || !guild?.name) return;
      const name = guild.name.trim();
      if (!name || name.toLowerCase() === "unknown") return;
      channelToServer[channelData.id] = guild.id;
      serverNames[guild.id] = name;
    } catch (err) {
      console.warn("Failed to process server data:", err);
    }
  }));

  return { channelToServer, serverNames };
}

export { processServers };