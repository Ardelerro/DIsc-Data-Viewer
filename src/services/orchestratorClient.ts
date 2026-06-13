import EngineWorker from "./engine.worker.ts?worker";
import { JobRunner } from "./jobRunner";
import type { OrchestratorEvent, OrchestratorRequest, JobStatus, UploadOptions } from "../types/worker";


type Listener = (event: OrchestratorEvent) => void;

const listeners = new Set<Listener>();

function dispatch(event: OrchestratorEvent): void {
  for (const l of listeners) l(event);
}

let worker: Worker | null = null;
let fallback: JobRunner | null = null;

function ensureBackend(): void {
  if (worker || fallback) return;
  if (typeof Worker !== "undefined") {
    try {
      worker = new EngineWorker();
      worker.onmessage = (ev: MessageEvent<OrchestratorEvent>) => {
        if (ev.data) dispatch(ev.data);
      };
      return;
    } catch (err) {
      console.warn(
        "Engine worker unavailable; processing will run in-page:",
        err,
      );
      worker = null;
    }
  }
  fallback = new JobRunner((event) => dispatch(event));
}

function send(req: OrchestratorRequest): void {
  ensureBackend();
  if (worker) {
    worker.postMessage(req);
    return;
  }
  if (!fallback) return;
  switch (req.type) {
    case "start":
      fallback.start(req.file, req.options);
      break;
    case "cancel":
      fallback.cancel();
      break;
    case "clear":
      fallback.clear();
      break;
    case "getState":
      dispatch({ type: "state", state: fallback.state });
      break;
  }
}

let pendingResolve: (() => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;
let lastStatus: JobStatus = "idle";

function settle(fn: () => void): void {
  fn();
  pendingResolve = null;
  pendingReject = null;
}

listeners.add((event) => {
  if (event.type === "done") {
    settle(() => pendingResolve?.());
  } else if (event.type === "error") {
    settle(() => pendingReject?.(new Error(event.message)));
  } else if (event.type === "state") {
    const st = event.state.status;
    if (st === "done" || (st === "running" && event.state.mainDone)) {
      settle(() => pendingResolve?.());
    } else if (st === "error") {
      settle(() =>
        pendingReject?.(new Error(event.state.errorMessage ?? "Processing failed")),
      );
    } else if (st === "idle" && lastStatus === "running") {
      const abort = new Error("Aborted");
      abort.name = "AbortError";
      settle(() => pendingReject?.(abort));
    }
    lastStatus = st;
  }
});

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  ensureBackend();
  return () => {
    listeners.delete(listener);
  };
}

export function start(file: File, options: UploadOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    send({ type: "start", file, options });
  });
}

export function cancelUpload(): void {
  send({ type: "cancel" });
}

export function clearJob(): void {
  send({ type: "clear" });
}

export function requestState(): void {
  send({ type: "getState" });
}
