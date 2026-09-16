/** Multi-path debounced update scheduler (RD-02 fix, v2).
 *
 * True ~250ms trailing debounce per path batch, ~1s max wait.
 * pendingPaths: Set<string> — every affected path is processed; no
 * path is ever dropped. Same-path bursts process only the latest.
 * Injectable clock for tests. */

export interface SchedulerTask {
  (path: string): void | Promise<void>;
}

export class PendingPathScheduler {
  private readonly pending = new Set<string>();
  private readonly firstSeen = new Map<string, number>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private nowMs = 0;

  constructor(
    private readonly task: SchedulerTask,
    private readonly debounceMs = 250,
    private readonly maxWaitMs = 1000,
    private readonly clock: () => number = () => Date.now(),
  ) {}

  schedule(path: string): void {
    if (this.disposed) return;
    this.nowMs = this.clock();
    if (!this.pending.has(path)) {
      this.firstSeen.set(path, this.nowMs);
    }
    this.pending.add(path);
    this.resetTimer(this.debounceMs);
  }

  private resetTimer(delay: number): void {
    if (this.timer !== null) clearTimeout(this.timer);
    // Trailing debounce: fires after `delay` of no new schedules;
    // but each path has a hard max-wait deadline.
    const earliestDeadline = this.earliestDeadline();
    const actualDelay = Math.min(delay, earliestDeadline);
    this.timer = setTimeout(() => this.tick(), Math.max(1, actualDelay));
  }

  private earliestDeadline(): number {
    let earliest = this.maxWaitMs;
    for (const [path, seen] of this.firstSeen) {
      void path;
      const remaining = this.maxWaitMs - (this.nowMs - seen);
      if (remaining < earliest) earliest = remaining;
    }
    return Math.max(0, earliest);
  }

  private tick(): void {
    this.timer = null;
    if (this.disposed || this.pending.size === 0) return;
    this.nowMs = this.clock();
    const fire: string[] = [];
    const keep: string[] = [];
    for (const path of this.pending) {
      const seen = this.firstSeen.get(path) ?? this.nowMs;
      const age = this.nowMs - seen;
      if (age + this.debounceMs >= this.maxWaitMs) {
        fire.push(path); // hard deadline reached
      } else {
        keep.push(path);
      }
    }
    this.pending.clear();
    for (const p of keep) this.pending.add(p);
    for (const p of fire) this.firstSeen.delete(p);
    for (const p of fire) void this.task(p);
    if (this.pending.size > 0) {
      this.resetTimer(this.debounceMs);
    }
  }

  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const all = [...this.pending];
    this.pending.clear();
    this.firstSeen.clear();
    for (const path of all) void this.task(path);
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending.clear();
    this.firstSeen.clear();
  }

  get pendingPaths(): readonly string[] {
    return [...this.pending];
  }
}
