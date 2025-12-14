# Design: Translation System Optimizations

## Architecture Overview

The proposed optimizations enhance the existing translation system without changing its core architecture. All changes are additive and focused on improving reliability, debugging capabilities, and user experience.

## Translation Prompt Optimization

### Current Issue Analysis
The existing prompts allow LLMs to include meta-information like character counts and formatting notes. This happens because the prompts don't explicitly forbid such output.

### Design Solution
- **Strict Output Boundaries**: Add explicit instructions to return only the translated content without any meta-commentary
- **Negative Constraints**: Include examples of what NOT to output (character counts, formatting notes, etc.)
- **Rely on Prompt Engineering**: Use clear, unambiguous instructions in the prompt rather than post-processing code

### Implementation Strategy
```typescript
// Enhanced prompt structure
const enhancedPrompt = basePrompt + `
IMPORTANT OUTPUT REQUIREMENTS:
- Return ONLY the translated content
- DO NOT include character counts, notes, or meta-information
- DO NOT add prefixes like "300字总结" or similar
- Output must be clean, ready-to-use content
`
```

## Progress Logging System

### Design Principles
- **Non-intrusive**: Logging should not significantly impact performance
- **Configurable Verbosity**: Allow different log levels for production vs debugging
- **Structured Format**: Use consistent log format for easy parsing

### Architecture
```
TranslationService
├── ProgressTracker (new)
│   ├── setCurrent(total)
│   ├── updateProgress(current)
│   └── getProgressPercentage()
└── EnhancedLogger (enhanced)
    ├── logTranslationStart(item, total, provider, model)
    ├── logTranslationProgress(current, total)
    └── logTranslationComplete(item, success)
```

### Logging Format
```json
{
  "timestamp": "2025-12-14T14:30:00Z",
  "type": "translation_progress",
  "item": 5,
  "total": 30,
  "percentage": 16.7,
  "provider": "deepseek",
  "model": "deepseek-chat",
  "operation": "title_translation"
}
```

## Enhanced Provider/Model Logging

### Integration Points
1. **TranslationService.init()**: Log provider selection
2. **Before each API call**: Log request details including provider/model
3. **After each API call**: Log success/failure with provider/model context

### Implementation
```typescript
class TranslationService {
  private logApiRequest(operation: string, content: string) {
    this.logger.info('API Request', {
      operation,
      provider: this.provider.name,
      model: this.provider.model,
      contentLength: content.length,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Comment Translation Reliability

### Root Cause Analysis
Comment translation failures may be caused by:
- Request timeouts during batch processing
- Rate limiting from LLM providers
- Network connectivity issues
- Temporary API issues

### Reliability Strategy
1. **Enhanced Timeout Handling**: Use existing provider timeout settings
2. **Retry Logic**: Exponential backoff for failed comment translations (3 retries with 1s, 2s, 4s delays)
3. **Graceful Degradation**: Return null on failure, allowing the system to continue

### Implementation Pattern
```typescript
async translateCommentsWithRetry(comments: Comment[]): Promise<string | null> {
  const maxRetries = 3;
  const baseDelay = 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await this.translateComments(comments);
      
      if (result) {
        return result;
      }
      
      this.logger.warn(`Comment translation attempt ${attempt} returned empty`);
    } catch (error) {
      this.logger.error(`Comment translation attempt ${attempt} failed`, error);
    }
    
    if (attempt < maxRetries) {
      await this.delay(baseDelay * Math.pow(2, attempt - 1));
    }
  }
  
  return null; // Graceful degradation
}
```

## Telegram Message Batching (Story Merging)

### Purpose
Reduce the number of Telegram messages by merging multiple stories into a single message. This provides:
- **Cleaner channel experience**: Fewer messages = fewer notifications
- **Better readability**: Related stories grouped together
- **Configurable grouping**: Adjust stories per message via `TELEGRAM_BATCH_SIZE`

### Design Rationale
Instead of sending one message per story (which can be noisy for channels with many daily stories), we merge multiple stories into batched messages.

**Example**: 10 stories with `TELEGRAM_BATCH_SIZE=2`
```
Message 1: Header
Message 2: Story 1 + Story 2 (merged)
Message 3: Story 3 + Story 4 (merged)
Message 4: Story 5 + Story 6 (merged)
Message 5: Story 7 + Story 8 (merged)
Message 6: Story 9 + Story 10 (merged)
Message 7: Footer

Total: 7 messages (instead of 12 individual messages)
```

### Implementation Design

#### Message Formatting
```typescript
/**
 * Format multiple stories into a single merged message
 */
function formatBatchMessage(stories: ProcessedStory[]): string {
  const storyTexts = stories.map(story => formatStoryMessage(story));
  
  // Join stories with visual separator
  return storyTexts.join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n');
}

/**
 * Format all stories into batched messages
 */
function formatMessagesWithBatching(
  stories: ProcessedStory[], 
  dateStr: string,
  batchSize: number
): string[] {
  const messages: string[] = [];
  
  // Header
  messages.push(formatHeaderMessage(dateStr, stories.length));
  
  // Split stories into batches
  for (let i = 0; i < stories.length; i += batchSize) {
    const batch = stories.slice(i, i + batchSize);
    messages.push(formatBatchMessage(batch));
  }
  
  // Footer
  messages.push(formatFooterMessage(dateStr, stories.length));
  
  return messages;
}
```

#### Publishing Flow
```typescript
async publish(content: PublishContent, config: PublisherConfig): Promise<void> {
  // 1. Get batch size from configuration
  const batchSize = getBatchSize(); // Default: 2
  
  // 2. Format stories into merged messages
  const messages = formatMessagesWithBatching(
    content.stories, 
    content.dateStr, 
    batchSize
  );
  
  // 3. Send messages sequentially
  for (let i = 0; i < messages.length; i++) {
    await sendMessage(token, channelId, messages[i], 'HTML');
    
    // Delay between messages (500ms)
    if (i < messages.length - 1) {
      await delay(MESSAGE_DELAY_MS);
    }
  }
}
```

### Message Structure

Each merged message contains:
```
1️⃣ Story 1 Title
🔗 原文链接
📝 Summary...
💬 评论要点: Comments...

━━━━━━━━━━━━━━━━━━━━

2️⃣ Story 2 Title
🔗 原文链接
📝 Summary...
💬 评论要点: Comments...
```

### Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `TELEGRAM_BATCH_SIZE` | Stories per message | 2 | `TELEGRAM_BATCH_SIZE=3` → merge 3 stories per message |

### Design Benefits
- **Reduced notifications**: Fewer messages = quieter channel
- **Grouped content**: Related stories appear together
- **Configurable**: Adjust grouping based on preference
- **Scalable**: Works with any number of stories
- **Visual separation**: Clear dividers between stories in merged messages

## Batch Processing Observability

### Problem Analysis
Current batch processing lacks visibility and debugging context:
- Users see "Starting batch content summarization: 30 articles" but no subsequent progress
- Errors like "API error: Unexpected end of JSON input" lack context (provider, model, batch size)
- JSON parsing failures don't show content preview or detailed error information
- Users cannot determine if system is stuck or making progress

### Design Solution

#### 1. Real-time Batch Progress Logging
Log batch start before processing each batch:
```typescript
console.log(`[Content Summary] Processing batch ${batchIdx + 1}/${batches.length}: ${batch.length} articles | Provider: ${providerName}/${modelName}`);
```

Benefits:
- Users see progress in real-time
- Can identify which batch is causing issues
- Provides immediate feedback that system is working

#### 2. Enhanced Error Logging with Context
All errors include comprehensive structured context:

**API Errors**:
```typescript
console.error(`[Content Summary] Batch ${batchIdx + 1}/${batches.length} failed:`, {
  error: getErrorMessage(result.error),
  batchSize: batch.length,
  provider: providerName,
  model: modelName,
  fallbackStrategy: 'Processing items individually',
});
```

**JSON Parse Errors**:
```typescript
console.error(`[Content Summary] Batch ${batchIdx + 1}/${batches.length} JSON parse failed:`, {
  error: getErrorMessage(parseResult.error),
  expectedItems: batch.length,
  provider: providerName,
  model: modelName,
  note: 'Check parseJsonArray logs above for content preview',
  fallbackStrategy: 'Processing items individually',
});
```

**Empty Content Errors**:
```typescript
console.error(`[Comment Summary] Batch ${batchIdx + 1}/${batches.length} returned empty content`, {
  batchSize: batch.length,
  provider: providerName,
  model: modelName,
  fallbackStrategy: 'Processing items individually with retry',
});
```

#### 3. Robust JSON Array Parsing
Enhanced `parseJsonArray()` to handle diverse LLM response formats:

**Supported Formats**:
- Markdown code blocks: `\`\`\`json`, `\`\`\`javascript`, `\`\`\``
- JSON surrounded by text: "Here are the results:\n[...]\nEnd of results"
- Trailing commas: `["a","b",]`
- Extra whitespace and empty lines

**Implementation**:
```typescript
export function parseJsonArray<T>(
  content: string,
  expectedLength?: number
): Result<T[]> {
  if (!content || content.trim().length === 0) {
    console.error('parseJsonArray: Empty or null content received');
    return Err(new Error('Empty content'));
  }

  // Step 1: Remove markdown code blocks (multiple formats)
  let cleanContent = content
    .replace(/```json\s*/g, '')
    .replace(/```javascript\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  // Step 2: Extract JSON array if surrounded by text
  const arrayMatch = cleanContent.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    cleanContent = arrayMatch[0];
  }

  // Step 3: Clean up common formatting issues
  cleanContent = cleanContent
    .replace(/^\s*[\r\n]+/gm, '')
    .replace(/,\s*([}\]])/g, '$1')
    .trim();

  // Step 4: Attempt to parse with detailed error logging
  try {
    parsed = JSON.parse(cleanContent);
  } catch (error) {
    console.error('parseJsonArray: Failed to parse JSON', {
      error: errorMsg,
      contentPreview: getContentPreview(cleanContent),
      contentLength: cleanContent.length,
    });
    
    if (cleanContent.includes('{') && cleanContent.includes('}')) {
      console.error('parseJsonArray: Content appears to contain JSON but parsing failed');
    }
    
    return Err(new Error(`Failed to parse JSON: ${errorMsg}`));
  }

  // Step 5: Log success
  console.log(`parseJsonArray: Successfully parsed ${parsed.length} items`);
  return Ok(parsed as T[]);
}
```

**Error Logging Details**:
- `contentPreview`: First 200 characters of cleaned content
- `contentLength`: Total length of content
- Helpful context when JSON structures detected but parsing fails

### Design Principles
- **Non-blocking**: All logging is synchronous and minimal overhead
- **Structured Context**: All errors include complete context for debugging
- **Consistent Prefixes**: Use `[Content Summary]`, `[Comment Summary]`, `parseJsonArray:` prefixes
- **Fallback Communication**: Always indicate recovery strategy in error logs
- **Developer-focused**: Internal observability, not user-facing troubleshooting

### Integration Points
1. `src/services/translator/summary.ts`:
   - `summarizeContentBatch()`: Add batch start logs and enhanced error logging
   - `summarizeCommentsBatch()`: Add batch start logs and enhanced error logging
2. `src/utils/array.ts`:
   - `parseJsonArray()`: Enhanced format handling and error logging
3. `src/config/constants.ts`:
   - Update `LLM_BATCH_CONFIG` comments with best practices

## Testing Strategy

### Unit Testing
- Prompt effectiveness tests
- Logging format validation
- Retry logic verification
- Batch splitting logic

### Integration Testing
- End-to-end translation with enhanced prompts
- Progress logging during translation workflows
- Comment translation failure scenarios
- Telegram batch sending simulation

### Performance Testing
- Measure impact of enhanced logging
- Validate batch sending timing
- Test retry logic overhead

## Configuration

### New Configuration Options
```typescript
// Progress logging configuration
const PROGRESS_LOG_INTERVAL = 5; // Log every 5 items
const ENABLE_DETAILED_LOGGING = false; // Production vs debugging

// Comment translation reliability
const COMMENT_TRANSLATION_TIMEOUT = 15000; // 15 seconds
const COMMENT_MAX_RETRIES = 3;
const COMMENT_RETRY_BASE_DELAY = 1000; // 1 second

// Telegram batch sending
const TELEGRAM_BATCH_SIZE = 2;
const TELEGRAM_INTER_BATCH_DELAY = 2000; // 2 seconds
```

## Backward Compatibility

All changes are backward compatible:
- Existing prompt templates are enhanced, not replaced
- Logging is additive, doesn't change existing log formats
- Retry mechanisms are internal to the service
- Telegram batching maintains the same external interface