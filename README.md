# HackerNews Daily - Chinese Translation

A CLI tool that fetches top HackerNews stories from the past 24 hours, translates titles and article summaries to Chinese using DeepSeek AI, and displays them in a clean card-based format.

## Features

- 🔍 Fetches best stories from HackerNews API
- 📄 Extracts article summaries from original URLs
- 🌏 Translates titles and descriptions to Chinese using DeepSeek LLM
- 📊 Displays results in a clean card-based format with timestamps
- ⚙️ Configurable via environment variables
- 🛡️ Graceful error handling with helpful messages
- ⚡ Parallel article fetching for optimal performance

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
3. Fetch article descriptions from original URLs
4. Translate titles and descriptions to Chinese
5. Display results in a card-based format with timestamps

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

Fetching article details...

Translating descriptions to Chinese...
Translated 5/28 descriptions...
...

Rendering results...

#1 【人工智能的未来展望】
The Future of Artificial Intelligence
发布时间：2025-12-06 14:30
链接：https://example.com/article
描述：本文探讨了人工智能技术的最新发展和未来趋势...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#2 【新型编程语言发布】
New Programming Language Released
发布时间：2025-12-06 12:15
链接：https://example.com/article2
描述：一个专注于性能和安全性的全新编程语言正式发布...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
│   └── hackerNews.ts       # HackerNews API client
├── services/
│   ├── translator.ts       # DeepSeek translation service
│   └── articleFetcher.ts   # Article metadata fetching service
└── index.ts                # Main CLI entry point
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

### No descriptions shown ("暂无描述")
This happens when:
- The article URL blocks automated requests
- The website doesn't have meta description tags
- The fetch times out after 5 seconds
- The tool continues gracefully without breaking

### No stories found
Try increasing `HN_TIME_WINDOW_HOURS` in your `.env` file to look further back in time.

## API Documentation

- **HackerNews API**: https://github.com/HackerNews/API
- **DeepSeek API**: https://platform.deepseek.com/api-docs/

## License

MIT
