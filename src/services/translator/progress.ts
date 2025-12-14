/**
 * Progress tracking utility for translation operations
 * Provides configurable progress logging for long-running batch operations
 */

export interface ProgressConfig {
  /** Log progress every N items */
  logInterval?: number;
  /** Enable detailed logging */
  detailedLogging?: boolean;
}

export class ProgressTracker {
  private total: number = 0;
  private current: number = 0;
  private lastLoggedAt: number = 0;
  private startTime: number = 0;
  private config: Required<ProgressConfig>;

  constructor(config: ProgressConfig = {}) {
    this.config = {
      logInterval: config.logInterval ?? 5,
      detailedLogging: config.detailedLogging ?? false,
    };
  }

  /**
   * Initialize progress tracking for a new batch
   * @param total - Total number of items to process
   */
  start(total: number): void {
    this.total = total;
    this.current = 0;
    this.lastLoggedAt = 0;
    this.startTime = Date.now();
  }

  /**
   * Update progress counter
   * @param current - Current item number (1-based)
   * @returns true if progress should be logged
   */
  update(current: number): boolean {
    this.current = current;
    
    // Log at intervals or at completion
    const isInterval = (current - this.lastLoggedAt) >= this.config.logInterval;
    const isComplete = current === this.total;
    
    if (isInterval || isComplete) {
      this.lastLoggedAt = current;
      return true;
    }
    
    return false;
  }

  /**
   * Get current progress percentage
   * @returns Progress percentage (0-100)
   */
  getPercentage(): number {
    if (this.total === 0) return 0;
    return Math.round((this.current / this.total) * 100);
  }

  /**
   * Get elapsed time in seconds
   * @returns Elapsed time since start
   */
  getElapsedSeconds(): number {
    return Math.round((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get estimated time remaining in seconds
   * @returns Estimated seconds remaining, or null if cannot estimate
   */
  getEstimatedRemainingSeconds(): number | null {
    if (this.current === 0) return null;
    
    const elapsed = Date.now() - this.startTime;
    const avgTimePerItem = elapsed / this.current;
    const remaining = this.total - this.current;
    
    return Math.round((avgTimePerItem * remaining) / 1000);
  }

  /**
   * Format progress message
   * @param operation - Operation name (e.g., "title translation")
   * @param provider - LLM provider name
   * @param model - Model name
   * @returns Formatted progress message
   */
  formatMessage(operation: string, provider?: string, model?: string): string {
    const percentage = this.getPercentage();
    const elapsed = this.getElapsedSeconds();
    
    let message = `[${operation}] Progress: ${this.current}/${this.total} (${percentage}%)`;
    
    if (provider && model) {
      message += ` | Provider: ${provider}/${model}`;
    }
    
    if (this.config.detailedLogging) {
      message += ` | Elapsed: ${elapsed}s`;
      
      const estimated = this.getEstimatedRemainingSeconds();
      if (estimated !== null) {
        message += ` | ETA: ${estimated}s`;
      }
    }
    
    return message;
  }

  /**
   * Check if progress should be logged based on time elapsed
   * @param intervalSeconds - Log at least every N seconds
   * @returns true if enough time has passed since last log
   */
  shouldLogByTime(intervalSeconds: number = 30): boolean {
    const timeSinceLastLog = (Date.now() - this.startTime) / 1000;
    const lastLogTime = (this.lastLoggedAt / this.total) * this.getElapsedSeconds();
    
    return (timeSinceLastLog - lastLogTime) >= intervalSeconds;
  }
}
