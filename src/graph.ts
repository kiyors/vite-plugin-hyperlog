/** Repeated module requests within one page load that suggest a graph re-walk. */
const REPEAT_THRESHOLD = 8;

/**
 * Minimum number of *distinct* modules that must have been repeated.
 *
 * Without this floor, repeatedly fetching a single module (polling, a prefetch
 * retry, a flaky asset) trips the detector and reports a graph re-evaluation
 * that never happened.
 */
const MIN_DISTINCT_REPEATED = 5;

export interface GraphReevaluation {
  /** Total distinct modules requested during this page load. */
  distinctModules: number;
  /** How many times already-seen modules were requested again. */
  repeatedRequests: number;
  /** Elapsed time since the page load started, in milliseconds. */
  windowMs: number;
}

/**
 * Watches module traffic for the signature of a graph re-evaluation: many
 * distinct modules being requested a second time with no document request in
 * between.
 *
 * That pattern means the entry graph ran twice inside a single page load, which
 * in practice comes from a duplicate `<script type="module">` in `index.html` or
 * a cache-busted dynamic `import()` of the entry module.
 */
export class GraphReevaluationDetector {
  private readonly seen = new Set<string>();
  private readonly repeated = new Set<string>();
  private repeats = 0;
  private pageStart: number;
  private reported = false;

  constructor(private readonly now: () => number = () => performance.now()) {
    this.pageStart = now();
  }

  /**
   * Feeds one request URL.
   *
   * Returns a report exactly once per page load, when the traffic looks like a
   * re-walk. Any non-module request is treated as a document request and resets
   * the per-page-load state.
   */
  observe(isModule: boolean, url: string): GraphReevaluation | null {
    if (!isModule) {
      this.seen.clear();
      this.repeated.clear();
      this.repeats = 0;
      this.reported = false;
      this.pageStart = this.now();
      return null;
    }

    if (!this.seen.has(url)) {
      this.seen.add(url);
      return null;
    }

    this.repeats += 1;
    this.repeated.add(url);

    if (this.reported) return null;
    if (this.repeats < REPEAT_THRESHOLD) return null;
    if (this.repeated.size < MIN_DISTINCT_REPEATED) return null;

    this.reported = true;
    return {
      distinctModules: this.seen.size,
      repeatedRequests: this.repeats,
      windowMs: this.now() - this.pageStart,
    };
  }
}
