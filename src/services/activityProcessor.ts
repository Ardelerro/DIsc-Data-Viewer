import { BlobReader, ZipReader } from "@zip.js/zip.js";
import type { ActivityStats } from "../types/discord";

async function processActivities(
  zipFile: File | Blob,
  onProgress?: (progress: number) => void
): Promise<ActivityStats> {
  const zipReader = new ZipReader(new BlobReader(zipFile));

  const entries = await zipReader.getEntries();
  const activityEntry =
    entries.find((e) =>
      /Activity\/Analytics\/[^/]+\.json$/i.test(e.filename)
    ) || entries.find((e) => /Account\/activity\.json$/i.test(e.filename));

  if (!activityEntry) {
    console.warn("No activity or analytics file found");
    await zipReader.close();
    return {
      addReaction: 0,
      attachmentsSent: 0,
      joinVoice: 0,
      startCall: 0,
      joinCall: 0,
      appOpened: 0,
    };
  }
  const counters = {
    addReaction: 0,
    attachmentsSent: 0,
    joinVoice: 0,
    startCall: 0,
    joinCall: 0,
    appOpened: 0,
  };

  if (activityEntry.directory) {
    return counters;
  }

  let leftover = "";
  const decoder = new TextDecoder();

  const patterns = {
    addReaction: "add_reaction",
    attachmentsSent: "message_sent_with_attachments",
    joinVoice: "join_voice_channel",
    startCall: "start_call",
    joinCall: "join_call",
    appOpened: "app_opened",
  };

  let processedBytes = 0;
  const totalBytes = activityEntry.uncompressedSize || 1;
  const writableStream = new WritableStream({
    write(chunk) {
      const text = leftover + decoder.decode(chunk, { stream: true });
      const newlineIdx = text.lastIndexOf("\n");

      if (newlineIdx === -1) {
        leftover = text;
        return;
      }

      const toProcess = text.slice(0, newlineIdx);
      leftover = text.slice(newlineIdx + 1);

      processedBytes += chunk.byteLength;
      if (processedBytes % 10000 == 0 || processedBytes === totalBytes) {
        const progress = Math.min(100, (processedBytes / totalBytes) * 100);
        onProgress?.(progress);
      }

      let pos = 0;
      while (pos < toProcess.length) {
        const nextNewline = toProcess.indexOf("\n", pos);
        const lineEnd = nextNewline === -1 ? toProcess.length : nextNewline;
        const line = toProcess.slice(pos, lineEnd);

        if (line.length > 10) {
          if (line.indexOf(patterns.addReaction) !== -1) counters.addReaction++;
          else if (line.indexOf(patterns.attachmentsSent) !== -1)
            counters.attachmentsSent++;
          else if (line.indexOf(patterns.joinVoice) !== -1)
            counters.joinVoice++;
          else if (line.indexOf(patterns.startCall) !== -1)
            counters.startCall++;
          else if (line.indexOf(patterns.joinCall) !== -1) counters.joinCall++;
          else if (line.indexOf(patterns.appOpened) !== -1)
            counters.appOpened++;
        }

        pos = lineEnd + 1;
      }
    },

    close() {
      if (leftover.length > 10) {
        if (leftover.indexOf(patterns.addReaction) !== -1)
          counters.addReaction++;
        else if (leftover.indexOf(patterns.attachmentsSent) !== -1)
          counters.attachmentsSent++;
        else if (leftover.indexOf(patterns.joinVoice) !== -1)
          counters.joinVoice++;
        else if (leftover.indexOf(patterns.startCall) !== -1)
          counters.startCall++;
        else if (leftover.indexOf(patterns.joinCall) !== -1)
          counters.joinCall++;
        else if (leftover.indexOf(patterns.appOpened) !== -1)
          counters.appOpened++;
      }
    },
  });

  await activityEntry.getData(writableStream);

  await zipReader.close();
  return counters;
}

export { processActivities };