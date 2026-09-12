const test = require('node:test');
const assert = require('node:assert/strict');
const { TinyfishClient } = require('../dist/api/tinyfish');
const { Translator } = require('../dist/services/translator');
const original = 'https://example.com/article';
const alternative = 'https://news.example/story';
const page = (url, extra = {}) => ({ url, final_url: url, title: 'Article', text: 'Verified article body.', format: 'markdown', ...extra });

function mockFetch(t, handler) {
  const previous = global.fetch;
  global.fetch = async (url, options) => handler(String(url), options);
  t.after(() => { global.fetch = previous; });
}
const json = body => new Response(JSON.stringify(body));

test('search uses title, filters roots, credentials, duplicates and caps at three', async t => {
  mockFetch(t, (url, options) => {
    assert.equal(new URL(url).searchParams.get('query'), 'C++ & 中文');
    assert.equal(options.headers['X-API-Key'], 'test-key');
    assert.equal(options.redirect, 'error');
    return json({ results: [original, 'https://example.com', 'https://u:p@example.com/a', alternative,
      alternative + '?utm_source=hn', 'https://other.example/b', 'https://third.example/c', 'https://fourth.example/d']
      .map(url => ({ url, snippet: 'Do not summarize this' })) });
  });
  assert.deepEqual(await new TinyfishClient('test-key').search('C++ & 中文', original),
    [alternative, 'https://other.example/b', 'https://third.example/c']);
});

test('fetch accepts only requested successful Markdown bodies and records redirects', async t => {
  mockFetch(t, (url, options) => {
    assert.equal(url, 'https://api.fetch.tinyfish.ai');
    assert.deepEqual(JSON.parse(options.body).urls, [original, alternative]);
    return json({ results: [page(original, { final_url: original + '?utm_source=hn' }), page(alternative),
      page('https://unrequested.example/a')], errors: [{ url: alternative, error: 'page_not_found', status: 404 }] });
  });
  assert.deepEqual(await new TinyfishClient('test-key').fetchPages([original, alternative]),
    [{ url: original, finalUrl: original, title: 'Article', text: 'Verified article body.' }]);
});

test('HTTP errors exclude response body and credentials', async t => {
  mockFetch(t, () => new Response('test-key', { status: 401 }));
  await assert.rejects(new TinyfishClient('test-key').fetchPages([original]), { message: 'Tinyfish HTTP 401' });
});

function setup(t, primary = null, reply = { summary: '这是有正文依据的摘要。', sourceIndexes: [0] }) {
  const translator = new Translator();
  translator.init({ apiKey: 'test', tinyfishApiKey: 'test-key' });
  translator.provider.summarizeUrl = async () => {
    if (primary instanceof Error) throw primary;
    return primary;
  };
  translator.provider.chatCompletion = async messages => {
    assert.ok(!messages[1].content.includes('SECRET_SNIPPET'));
    return { content: JSON.stringify(reply) };
  };
  return translator;
}

test('primary success and missing external URL do not call Tinyfish', async t => {
  mockFetch(t, () => { throw new Error('unexpected request'); });
  const translator = setup(t, { summary: '原文摘要', source: 'original', sourceUrls: [] });
  const results = await translator.summarizeUrls([{ title: 'Article', url: original }, { title: 'Ask HN' }]);
  assert.deepEqual(results.map(r => r.source), ['original', 'no-external-link']);
});

test('original body recovers primary exceptions without search', async t => {
  mockFetch(t, url => { assert.equal(url, 'https://api.fetch.tinyfish.ai'); return json({ results: [page(original)] }); });
  const [result] = await setup(t, new Error('primary failed')).summarizeUrls([{ title: 'Article', url: original }]);
  assert.equal(result.source, 'original');
  assert.deepEqual(result.sourceUrls, []);
});

test('failed original fetch searches title then fetches alternative; only used sources are retained', async t => {
  let calls = 0;
  mockFetch(t, url => {
    calls++;
    if (calls === 1) return json({ results: [], errors: [{ url: original, status: 404 }] });
    if (calls === 2) {
      assert.equal(new URL(url).searchParams.get('query'), 'Article');
      return json({ results: [{ url: alternative, snippet: 'SECRET_SNIPPET' }] });
    }
    return json({ results: [page(alternative, { final_url: 'https://news.example/final' })] });
  });
  const [result] = await setup(t).summarizeUrls([{ title: 'Article', url: original }]);
  assert.equal(calls, 3);
  assert.equal(result.source, 'alternative');
  assert.deepEqual(result.sourceUrls, ['https://news.example/final']);
});

for (const reply of [{ summary: '', sourceIndexes: [] }, { summary: 'Invented', sourceIndexes: [99] },
  { summary: 'Invented', sourceIndexes: ['0'] }, null]) {
  test(`rejects insufficient/unrelated evidence or invalid source indexes: ${JSON.stringify(reply)}`, async t => {
    mockFetch(t, url => json(url.includes('search') ? { results: [] } : { results: [page(original)] }));
    const [result] = await setup(t, null, reply).summarizeUrls([{ title: 'Article', url: original }]);
    assert.equal(result.source, 'unavailable');
  });
}

test('Tinyfish failure preserves unavailable; next story still processed', async t => {
  mockFetch(t, () => { throw new Error('timeout'); });
  const results = await setup(t).summarizeUrls([{ title: 'A', url: original }, { title: 'B', url: alternative }]);
  assert.deepEqual(results.map(r => r.source), ['unavailable', 'unavailable']);
});

test('missing key disables compensation and reinitialization clears old key', async t => {
  mockFetch(t, () => { throw new Error('unexpected request'); });
  const translator = setup(t);
  translator.init({ apiKey: 'test' });
  translator.provider.summarizeUrl = async () => null;
  const [result] = await translator.summarizeUrls([{ title: 'A', url: original }]);
  assert.equal(translator.tinyfish, null);
  assert.equal(result.source, 'unavailable');
});

test('original request exception still searches and recovers alternative', async t => {
  let calls = 0;
  mockFetch(t, url => {
    if (++calls === 1) throw new Error('timeout');
    return json(url.includes('search') ? { results: [{ url: alternative }] } : { results: [page(alternative)] });
  });
  const [result] = await setup(t).summarizeUrls([{ title: 'Article', url: original }]);
  assert.equal(calls, 3);
  assert.equal(result.source, 'alternative');
});

for (const status of [401, 403, 429]) {
  test(`original HTTP ${status} stops without repeated requests`, async t => {
    let calls = 0;
    mockFetch(t, () => { calls++; return new Response('', { status }); });
    const [result] = await setup(t).summarizeUrls([{ title: 'Article', url: original }]);
    assert.equal(calls, 1);
    assert.equal(result.source, 'unavailable');
  });
}

test('rejected original searches alternatives and retains only the selected body source', async t => {
  const second = 'https://second.example/article';
  let calls = 0;
  mockFetch(t, url => {
    if (++calls === 1) return json({ results: [page(original)] });
    if (url.includes('search')) return json({ results: [{ url: alternative }, { url: second }] });
    return json({ results: [page(alternative), page(second)] });
  });
  const translator = setup(t);
  let summaries = 0;
  translator.provider.chatCompletion = async () => ({ content: JSON.stringify(++summaries === 1
    ? { summary: '', sourceIndexes: [] }
    : { summary: '已核实的相关文章摘要。', sourceIndexes: [1] }) });
  const [result] = await translator.summarizeUrls([{ title: 'Article', url: original }]);
  assert.equal(summaries, 2);
  assert.deepEqual(result.sourceUrls, [second]);
});
