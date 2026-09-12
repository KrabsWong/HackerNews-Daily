import { normalizeSourceUrl, sanitizeSourceUrl } from '../../services/llm/deepseek';

export interface FetchedPage {
  url: string;
  finalUrl: string;
  title: string;
  text: string;
}

export class TinyfishError extends Error {
  constructor(public status: number) {
    super(`Tinyfish HTTP ${status}`);
  }
}

export class TinyfishClient {
  constructor(private apiKey: string) {}

  private async request(endpoint: string, body?: object): Promise<any> {
    // Keep the timeout active through body consumption; never log provider error bodies.
    const response = await fetch(endpoint, {
      method: body ? 'POST' : 'GET',
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new TinyfishError(response.status);
    return response.json();
  }

  async search(title: string, originalUrl: string): Promise<string[]> {
    const query = new URLSearchParams({ query: title, location: 'US', language: 'en' });
    const data = await this.request(`https://api.search.tinyfish.ai?${query}`);
    if (!Array.isArray(data?.results)) return [];
    const urls = new Map<string, string>();
    for (const result of data.results) {
      const url = typeof result?.url === 'string' ? sanitizeSourceUrl(result.url) : null;
      if (!url) continue;
      const parsed = new URL(url);
      const normalized = normalizeSourceUrl(url)!;
      if (parsed.pathname === '/' || normalized === normalizeSourceUrl(originalUrl)) continue;
      urls.set(normalized, url);
      if (urls.size === 3) break;
    }
    return [...urls.values()];
  }

  async fetchPages(urls: string[]): Promise<FetchedPage[]> {
    const requested = new Set(urls.map(normalizeSourceUrl).filter(Boolean));
    if (!requested.size) return [];
    const data = await this.request('https://api.fetch.tinyfish.ai', {
      urls, format: 'markdown', ttl: 0, per_url_timeout_ms: 15000,
    });
    if (!Array.isArray(data?.results)) return [];
    const failed = new Set((Array.isArray(data.errors) ? data.errors : [])
      .map((error: any) => typeof error?.url === 'string' ? normalizeSourceUrl(error.url) : null));
    const pages = new Map<string, FetchedPage>();
    for (const page of data.results) {
      const url = typeof page?.url === 'string' ? sanitizeSourceUrl(page.url) : null;
      const finalUrl = typeof page?.final_url === 'string' ? sanitizeSourceUrl(page.final_url) : url;
      if (!url || !finalUrl || !requested.has(normalizeSourceUrl(url)) || failed.has(normalizeSourceUrl(url))) continue;
      if (page.format !== 'markdown' || typeof page.text !== 'string' || !page.text.trim()) continue;
      pages.set(normalizeSourceUrl(finalUrl)!, {
        url, finalUrl, title: typeof page.title === 'string' ? page.title : '',
        text: page.text.trim().slice(0, 20000),
      });
    }
    return [...pages.values()];
  }
}
