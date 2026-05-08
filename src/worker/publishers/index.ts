import type { Publisher } from '../../types/publisher';
import { PublisherType } from '../../types/publisher';
import { GitHubPublisher } from './github';
import { TelegramPublisher } from './telegram';
import { TerminalPublisher } from './terminal';

const publishers: Record<PublisherType, Publisher> = {
  [PublisherType.GITHUB]: new GitHubPublisher(),
  [PublisherType.TELEGRAM]: new TelegramPublisher(),
  [PublisherType.TERMINAL]: new TerminalPublisher(),
};

export function getPublisher(type: PublisherType): Publisher {
  const publisher = publishers[type];
  if (!publisher) {
    throw new Error(`Unknown publisher type: ${type}`);
  }
  return publisher;
}

export function getAllPublishers(): Publisher[] {
  return Object.values(publishers);
}

export { GitHubPublisher, TelegramPublisher, TerminalPublisher };