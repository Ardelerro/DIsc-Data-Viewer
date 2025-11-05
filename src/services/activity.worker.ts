let leftoverBytes = new Uint8Array(0);
const decoder = new TextDecoder("utf-8", { fatal: false });

const patterns = {
  addReaction: "add_reaction",
  attachmentsSent: "message_sent_with_attachments",
  joinVoice: "join_voice_channel",
  startCall: "start_call",
  joinCall: "join_call",
  appOpened: "app_opened",
};

const counters = {
  addReaction: 0,
  attachmentsSent: 0,
  joinVoice: 0,
  startCall: 0,
  joinCall: 0,
  appOpened: 0,
};

const patternToCounterKey = Object.entries(patterns).reduce((acc, [key, value]) => {
  acc[value] = key as keyof typeof counters;
  return acc;
}, {} as { [key: string]: keyof typeof counters });

const patternsRegex = new RegExp(Object.values(patterns).join("|"));

let processedBytes = 0;
let totalBytes = 1;
let lastProgress = 0;

function processLine(line: string) {
  if (line.length < 10) return;
  const match = patternsRegex.exec(line);
  if (match) {
    const key = patternToCounterKey[match[0]];
    if (key) counters[key]++;
  }
}

function processChunk(chunk: Uint8Array) {
  // Combine leftover bytes + new chunk
  const combined = new Uint8Array(leftoverBytes.length + chunk.length);
  combined.set(leftoverBytes);
  combined.set(chunk, leftoverBytes.length);

  // Decode the full chunk
  const text = decoder.decode(combined, { stream: true });

  // Find the last newline in decoded text
  const lastNewlineIndex = text.lastIndexOf("\n");

  if (lastNewlineIndex === -1) {
    // No complete line yet — keep bytes as leftover
    leftoverBytes = combined;
    return;
  }

  // Split text into processable + leftover part
  const processableText = text.slice(0, lastNewlineIndex);
  const leftoverText = text.slice(lastNewlineIndex + 1);

  // Re-encode leftover text back to bytes to preserve partial multibyte chars
  leftoverBytes = new TextEncoder().encode(leftoverText);

  // Process line by line
  let start = 0;
  let nextNewline;
  while ((nextNewline = processableText.indexOf("\n", start)) !== -1) {
    const line = processableText.slice(start, nextNewline);
    processLine(line);
    start = nextNewline + 1;
  }

  processedBytes += chunk.byteLength;
  const progress = Math.min(100, (processedBytes / totalBytes) * 100);
  if (progress - lastProgress > 1 || processedBytes === totalBytes) {
    lastProgress = progress;
    postMessage({ type: "progress", data: progress });
  }
}

function finalize() {
  if (leftoverBytes.length > 0) {
    const text = decoder.decode(leftoverBytes, { stream: false });
    if (text.length > 0) processLine(text);
  }
  postMessage({ type: "complete", data: counters });
  close();
}

self.onmessage = (event) => {
  const { type } = event.data;

  if (type === "init") {
    totalBytes = event.data.totalBytes;
  } else if (type === "chunk") {
    processChunk(event.data.chunk);
  } else if (type === "close") {
    finalize();
  }
};
