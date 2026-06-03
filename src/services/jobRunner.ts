import { runPipeline } from "./pipeline";
import { clearData } from "./dataStore";
import type { JobState, OrchestratorEvent, PipelineEvent, UploadOptions } from "../types/worker";


export function createInitialJobState(): JobState {
  return {
    status: "idle",
    mainDone: false,
    progress: 0,
    stage: "",
    activityProgress: null,
    snapshot: null,
    errorMessage: null,
  };
}

export class JobRunner {
  readonly state: JobState = createInitialJobState();
  private controller: AbortController | null = null;
  private readonly sink: (event: OrchestratorEvent) => void;

  constructor(sink: (event: OrchestratorEvent) => void) {
    this.sink = sink;
  }

  private reset(): void {
    Object.assign(this.state, createInitialJobState());
  }

  private readonly emit = (event: PipelineEvent): void => {
    const s = this.state;
    switch (event.type) {
      case "progress":
        s.progress = event.value;
        s.stage = event.stage;
        break;
      case "snapshot":
        s.snapshot = event.data;
        break;
      case "activityProgress":
        s.activityProgress = event.value;
        break;
      case "done":
        s.mainDone = true;
        break;
      case "error":
        s.errorMessage = event.message;
        break;
    }
    this.sink(event);
  };

  private broadcastState(): void {
    this.sink({ type: "state", state: this.state });
  }

  start(file: File, options: UploadOptions): void {
    if (this.state.status === "running") {
      this.broadcastState();
      return;
    }
    this.controller = new AbortController();
    this.reset();
    this.state.status = "running";
    this.state.stage = "Processing your data...";
    this.broadcastState();

    runPipeline(file, options, this.emit, this.controller.signal)
      .then(() => {
        this.state.status = "done";
        this.state.activityProgress = null;
        this.broadcastState();
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") {
          this.reset();
        } else {
          this.state.status = "error";
          this.state.activityProgress = null;
          this.state.errorMessage =
            err instanceof Error ? err.message : "Unknown error";
        }
        this.broadcastState();
      });
  }

  cancel(): void {
    this.controller?.abort();
  }

  clear(): void {
    this.controller?.abort();
    this.reset();
    void clearData();
    this.broadcastState();
  }
}
