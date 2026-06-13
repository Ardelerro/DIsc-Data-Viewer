import { JobRunner } from "./jobRunner";
import type { OrchestratorEvent, OrchestratorRequest } from "../types/worker";

// Dedicated "engine" worker that hosts the pipeline. It is spawned from the
// page (a dedicated worker), so the message/activity/sentiment pools it spawns
// are dedicated→dedicated nesting — which Chromium permits, unlike spawning
// dedicated workers from a SharedWorker. Talks to a single parent (the page)
// via postMessage/onmessage; the cross-thread protocol is unchanged.

const post = (e: OrchestratorEvent) =>
  (postMessage as (m: OrchestratorEvent) => void)(e);

const runner = new JobRunner((event) => post(event));

self.onmessage = (ev: MessageEvent<OrchestratorRequest>) => {
  const req = ev.data;
  if (!req) return;
  switch (req.type) {
    case "start":
      runner.start(req.file, req.options);
      break;
    case "cancel":
      runner.cancel();
      break;
    case "getState":
      post({ type: "state", state: runner.state });
      break;
    case "clear":
      runner.clear();
      break;
  }
};
