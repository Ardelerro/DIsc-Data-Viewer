import { BlobReader, ZipReader } from "@zip.js/zip.js";
import type { ActivityStats } from "../types/discord";

import ActivityWorker from './activity.worker.ts?worker';

async function processActivities(
  zipFile: File | Blob,
  onProgress?: (progress: number) => void
): Promise<ActivityStats> {
  const startTime = performance.now(); 
  const zipReader = new ZipReader(new BlobReader(zipFile));
  const entries = await zipReader.getEntries();
  
  const activityEntry =
    entries.find((e) =>
      /Activity\/Analytics\/[^/]+\.json$/i.test(e.filename)
    ) || entries.find((e) => /Account\/activity\.json$/i.test(e.filename));

  const defaultStats: ActivityStats = {
    addReaction: 0,
    attachmentsSent: 0,
    joinVoice: 0,
    startCall: 0,
    joinCall: 0,
    appOpened: 0,
  };

  if (!activityEntry || activityEntry.directory) {
    console.warn("No valid activity or analytics file found");
    await zipReader.close();
    return defaultStats;
  }

  const worker = new ActivityWorker();

  return new Promise((resolve, reject) => {
    worker.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'progress') {
        onProgress?.(data);
      } else if (type === 'complete') {
        resolve(data);
        worker.terminate();
        const endTime = performance.now();
        console.log(`Activity processing took ${endTime - startTime} ms`);
      }
    };

    worker.onerror = (error) => {
      console.error("Error in activity worker:", error);
      reject(error);
      worker.terminate();
    };
    
    const totalBytes = activityEntry.uncompressedSize || 1;
    
    worker.postMessage({ type: 'init', totalBytes });

    activityEntry.getData(new WritableStream({
      write(chunk) {
        worker.postMessage({ type: 'chunk', chunk }, [chunk.buffer]);
      },
      close() {
        worker.postMessage({ type: 'close' });
      },
      abort(reason) {
        reject(reason);
        worker.terminate();
      }
    }));

    zipReader.close();
  });
}

export { processActivities };