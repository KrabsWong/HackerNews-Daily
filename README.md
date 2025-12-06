# HackerNews Daily - Chinese Translation

A CLI tool that fetches top HackerNews stories from the past 24 hours and translates titles to Chinese using DeepSeek AI.

## Features

- 🔍 Fetches best stories from HackerNews API
- 🌏 Translates titles to Chinese using DeepSeek LLM
- 📊 Displays results in a formatted console table
- ⚙️ Configurable via environment variables
- 🛡️ Graceful error handling with helpful messages

## Prerequisites

- Node.js (≥18.x recommended)
- DeepSeek API key (get one from [https://platform.deepseek.com/](https://platform.deepseek.com/))

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hacknews-daily
```

2. Install dependencies:
```bash
npm install
```

3. Configure your API key:
```bash
cp .env.example .env
# Edit .env and add your DeepSeek API key
```

Your `.env` file should look like:
```
DEEPSEEK_API_KEY=your_api_key_here
HN_STORY_LIMIT=30
HN_TIME_WINDOW_HOURS=24
```

## Usage

Run the CLI tool:
```bash
npm run fetch
```

This will:
1. Fetch the top stories from HackerNews
2. Filter stories from the past 24 hours
3. Translate each title to Chinese
4. Display results in a formatted table

## Configuration

Configure the tool by editing `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DEEPSEEK_API_KEY` | Your DeepSeek API key (required) | - |
| `HN_STORY_LIMIT` | Maximum number of stories to fetch | 30 |
| `HN_TIME_WINDOW_HOURS` | Only show stories from past N hours | 24 |

## Example Output

```
🔍 HackerNews Daily - Chinese Translation

Validating configuration...
Fetching HackerNews stories...
Found 28 stories from the past 24 hours

Translating titles to Chinese...
Translated 5/28 titles...
Translated 10/28 titles...
...

Rendering results...

┌──────┬────────────────────────────────┬────────────────────────────────┬───────┬──────────────────────────────┐
│ Rank │ Title (Chinese)                │ Title (English)                │ Score │ URL                          │
├──────┼────────────────────────────────┼────────────────────────────────┼───────┼──────────────────────────────┤
│ 1    │ 翻译的中文标题                   │ Original English Title         │ 342   │ https://example.com/...      │
│ 2    │ 另一个中文标题                   │ Another English Title          │ 256   │ https://example.com/...      │
└──────┴────────────────────────────────┴────────────────────────────────┴───────┴──────────────────────────────┘

✅ Successfully fetched and translated 28 stories
```

## Build

To build the TypeScript code:
```bash
npm run build
```

This creates a `dist/` directory with compiled JavaScript. You can then run:
```bash
npm start
```

## Error Handling

The tool handles various error scenarios gracefully:

- **Missing API key**: Shows setup instructions
- **Network errors**: Suggests checking internet connection
- **API failures**: Falls back to original English titles
- **Invalid stories**: Skips and continues processing

## Development

Project structure:
```
src/
├── api/
│   └── hackerNews.ts    # HackerNews API client
├── services/
│   └── translator.ts    # DeepSeek translation service
└── index.ts             # Main CLI entry point
```

## Troubleshooting

### "DEEPSEEK_API_KEY environment variable is required"
Make sure you've created a `.env` file with your API key.

### "Failed to fetch HackerNews stories"
Check your internet connection and verify that https://hacker-news.firebaseio.com is accessible.

### Translation shows original English
This happens when:
- DeepSeek API is temporarily unavailable
- Rate limits are hit
- The tool falls back gracefully to English titles

### No stories found
Try increasing `HN_TIME_WINDOW_HOURS` in your `.env` file to look further back in time.

## API Documentation

- **HackerNews API**: https://github.com/HackerNews/API
- **DeepSeek API**: https://platform.deepseek.com/api-docs/

## License

MIT
