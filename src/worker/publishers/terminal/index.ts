/**
 * Terminal Publisher
 * Outputs markdown content to stdout for local testing
 */

import type { Publisher, PublishContent, PublisherConfig } from '../../../types/publisher';
import { formatTerminalOutput } from './formatter';

/**
 * Terminal Publisher implementation
 * Outputs formatted markdown to stdout instead of publishing to external services
 * Used for local development and testing
 */
export class TerminalPublisher implements Publisher {
  readonly name = 'terminal';

  /**
   * Publish content to terminal (stdout)
   * @param content - Content to output
   * @param config - Publisher configuration (not used for terminal publisher)
   */
  async publish(content: PublishContent, config: PublisherConfig): Promise<void> {
    const output = formatTerminalOutput(content);
    console.log(output);
  }
}
