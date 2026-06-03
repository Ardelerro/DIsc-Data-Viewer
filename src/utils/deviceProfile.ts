interface CapNavigator {
  userAgent?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

function cap(): CapNavigator {
  return typeof navigator !== "undefined"
    ? (navigator as unknown as CapNavigator)
    : {};
}

const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk|Kindle/i;

export function isMobileDevice(): boolean {
  return MOBILE_UA.test(cap().userAgent ?? "");
}

export function isLowMemoryDevice(): boolean {
  const mem = cap().deviceMemory;
  if (typeof mem === "number" && mem > 0) return mem <= 4;
  return isMobileDevice();
}

export interface DeviceTuning {
  maxWorkers: number;
  channelPassConcurrency: number;
  streamThresholdBytes: number;
}

const MB = 1024 * 1024;

export function getDeviceTuning(): DeviceTuning {
  const cores = cap().hardwareConcurrency || 4;
  const mem = cap().deviceMemory;

  if (isMobileDevice() || isLowMemoryDevice()) {
    const veryLow = typeof mem === "number" && mem > 0 && mem <= 2;
    return {
      maxWorkers: Math.max(1, Math.min(veryLow ? 1 : 2, cores - 1)),
      channelPassConcurrency: 4,
      streamThresholdBytes: 4 * MB,
    };
  }

  return {
    maxWorkers: Math.max(2, Math.min(cores - 1, 10)),
    channelPassConcurrency: Infinity, // unbounded — preserves desktop behavior
    streamThresholdBytes: 24 * MB,
  };
}
