let leftoverText = "";
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

const patternToCounterKey = Object.entries(patterns).reduce(
  (acc, [key, value]) => {
    acc[value] = key as keyof typeof counters;
    return acc;
  },
  {} as { [key: string]: keyof typeof counters }
);

const patternsRegex = new RegExp(Object.values(patterns).join("|"));

let processedBytes = 0;
let totalBytes = 1;
let lastProgress = 0;

function processLine(line: string) {
  if (line.length < 9) return;
  const match = patternsRegex.exec(line);
  if (match) {
    const key = patternToCounterKey[match[0]];
    if (key) counters[key]++;
  }
}

function processChunk(chunk: Uint8Array) {
  const text = decoder.decode(chunk, { stream: true });

  const fullText = leftoverText + text;

  const lastNewlineIndex = fullText.lastIndexOf("\n");

  if (lastNewlineIndex === -1) {
    leftoverText = fullText;
    return;
  }

  const processableText = fullText.slice(0, lastNewlineIndex);
  leftoverText = fullText.slice(lastNewlineIndex + 1);


  let start = 0;
  let newlineIndex;
  while ((newlineIndex = processableText.indexOf('\n', start)) !== -1) {
    const line = processableText.slice(start, newlineIndex);
    processLine(line);
    start = newlineIndex + 1;
  }

  processedBytes += chunk.byteLength;
  const progress = Math.min(100, (processedBytes / totalBytes) * 100);
  if (progress - lastProgress > 1 || processedBytes === totalBytes) {
    lastProgress = progress;
    postMessage({ type: "progress", data: progress });
  }
}

function finalize() {
  const finalDecoded = decoder.decode(undefined, { stream: false });
  const finalText = leftoverText + finalDecoded;

  if (finalText.length > 0) {
    processLine(finalText);
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
