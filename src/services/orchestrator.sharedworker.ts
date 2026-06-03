import { JobRunner } from "./jobRunner";
import type {
  OrchestratorEvent,
  OrchestratorRequest,
} from "../types/discord";

const ports = new Set<MessagePort>();

function post(port: MessagePort, event: OrchestratorEvent): void {
  try {
    port.postMessage(event);
  } catch {
  }
}

const runner = new JobRunner((event) => {
  for (const port of ports) post(port, event);
});

function handleRequest(req: OrchestratorRequest, port: MessagePort): void {
  switch (req.type) {
    case "start":
      runner.start(req.file, req.options);
      break;
    case "cancel":
      runner.cancel();
      break;
    case "getState":
      post(port, { type: "state", state: runner.state });
      break;
    case "clear":
      runner.clear();
      break;
  }
}

const ctx = self as unknown as {
  onconnect: ((event: MessageEvent) => void) | null;
};

ctx.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  if (!port) return;
  ports.add(port);
  port.onmessage = (ev: MessageEvent<OrchestratorRequest>) => {
    if (ev.data) handleRequest(ev.data, port);
  };
  port.start();
  post(port, { type: "state", state: runner.state });
};
