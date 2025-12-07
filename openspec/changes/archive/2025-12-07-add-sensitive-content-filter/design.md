# Design: AI-Based Sensitive Content Filter

## Architecture Overview

This design document describes the implementation architecture for adding AI-based sensitive content filtering to the HackerNews Daily system.

## System Context

```
┌─────────────────────────────────────────────────────────────┐
│                    HackerNews Daily System                   │
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌───────────┐   ┌────────┐ │
│  │ HN API   │ → │  Filter  │ → │Translation│ → │ Export │ │
│  │ Fetcher  │   │ Service  │   │  Service  │   │        │ │
│  └──────────┘   └─────┬────┘   └───────────┘   └────────┘ │
│                       │                                      │
│                       ↓                                      │
│                 ┌────────────┐                              │
│                 │ DeepSeek   │                              │
│                 │ LLM API    │                              │
│                 └────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. ContentFilter Service

**Location**: `src/services/contentFilter.ts`

**Responsibilities**:
- Check if content filtering is enabled via configuration
- Send story titles to DeepSeek LLM for classification
- Parse AI responses and filter sensitive stories
- Handle errors gracefully with fallback behavior

**Interface**:
```typescript
export interface FilterClassification {
  index: number;
  classification: 'SAFE' | 'SENSITIVE';
  confidence?: number; // optional, for future use
}

export interface ContentFilter {
  /**
   * Filter stories by classifying titles with AI
   * @param stories - Array of HNStory objects to filter
   * @returns Array of stories classified as "SAFE"
   */
  filterStories(stories: HNStory[]): Promise<HNStory[]>;
  
  /**
   * Check if filtering is enabled
   */
  isEnabled(): boolean;
  
  /**
   * Get current sensitivity level
   */
  getSensitivityLevel(): 'low' | 'medium' | 'high';
}

export class AIContentFilter implements ContentFilter {
  private translator: Translator;
  private enabled: boolean;
  private sensitivity: 'low' | 'medium' | 'high';
  
  constructor(translator: Translator);
  
  async filterStories(stories: HNStory[]): Promise<HNStory[]>;
  isEnabled(): boolean;
  getSensitivityLevel(): 'low' | 'medium' | 'high';
  
  private async classifyTitles(titles: string[]): Promise<FilterClassification[]>;
  private buildClassificationPrompt(titles: string[]): string;
  private parseClassificationResponse(response: string): FilterClassification[];
}
```

### 2. Integration Point

**Location**: `src/index.ts` → `fetchFreshData()`

**Current Flow**:
```typescript
async function fetchFreshData() {
  const stories = await fetchTopStories(limit, hours);
  
  // Translate titles
  const titles = stories.map(s => s.title);
  const translatedTitles = await translator.translateBatch(titles);
  
  // Fetch articles & generate summaries
  // ...
}
```

**New Flow**:
```typescript
async function fetchFreshData() {
  const stories = await fetchTopStories(limit, hours);
  
  // NEW: Apply content filter
  const filteredStories = await contentFilter.filterStories(stories);
  
  console.log(`Filtered ${stories.length - filteredStories.length} stories`);
  
  // Translate titles (only filtered stories)
  const titles = filteredStories.map(s => s.title);
  const translatedTitles = await translator.translateBatch(titles);
  
  // Continue with filtered stories
  // ...
}
```

### 3. Configuration

**Location**: `src/config/constants.ts`

**New Constants**:
```typescript
export const CONTENT_FILTER = {
  // Enable/disable filtering
  ENABLED: process.env.ENABLE_CONTENT_FILTER === 'true',
  
  // Sensitivity level (low, medium, high)
  SENSITIVITY: (process.env.CONTENT_FILTER_SENSITIVITY || 'medium') as 
    'low' | 'medium' | 'high',
  
  // Timeout for AI classification (milliseconds)
  TIMEOUT: 15000,
  
  // Fallback behavior on error
  FALLBACK_ON_ERROR: true, // allow stories through if AI fails
} as const;
```

**Environment Variables** (`.env.example`):
```bash
# Content Filter Configuration
ENABLE_CONTENT_FILTER=false
CONTENT_FILTER_SENSITIVITY=medium  # low, medium, high
```

## AI Prompt Engineering

### Prompt Template

The prompt design is critical for accurate classification. Here's the detailed template:

```typescript
function buildClassificationPrompt(
  titles: string[], 
  sensitivity: string
): string {
  const sensitivityGuidelines = {
    low: `
      Only classify as SENSITIVE if the content:
      - Explicitly violates Chinese law
      - Contains explicit adult or violent content
      - Promotes illegal activities
    `,
    medium: `
      Classify as SENSITIVE if the content:
      - Relates to Chinese political controversies
      - Discusses topics restricted in mainland China
      - Contains explicit adult or violent content
      - Promotes illegal activities or hate speech
    `,
    high: `
      Classify as SENSITIVE if the content:
      - Relates to any Chinese political topics
      - Discusses censorship or internet freedom
      - Contains controversial social or political content
      - Contains adult, violent, or offensive content
      - Discusses topics that may be sensitive in China
    `
  };

  return `You are a content moderator for a Chinese news aggregator.
Your task is to classify news titles as either "SAFE" or "SENSITIVE".

Sensitivity Level: ${sensitivity}
${sensitivityGuidelines[sensitivity]}

IMPORTANT:
- Focus on the title content only
- Consider the context (e.g., historical discussion vs current politics)
- When in doubt at the boundary, classify as SAFE

Respond ONLY with a valid JSON array in this exact format:
[{"index": 0, "classification": "SAFE"}, {"index": 1, "classification": "SENSITIVE"}, ...]

Titles to classify:
${titles.map((title, i) => `${i}. ${title}`).join('\n')}

JSON Response:`;
}
```

### Response Parsing

```typescript
function parseClassificationResponse(response: string): FilterClassification[] {
  try {
    // Extract JSON from response (handles markdown code blocks)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    
    const classifications = JSON.parse(jsonMatch[0]);
    
    // Validate structure
    if (!Array.isArray(classifications)) {
      throw new Error('Response is not an array');
    }
    
    for (const item of classifications) {
      if (typeof item.index !== 'number' || 
          !['SAFE', 'SENSITIVE'].includes(item.classification)) {
        throw new Error('Invalid classification format');
      }
    }
    
    return classifications;
  } catch (error) {
    console.error('Failed to parse AI classification response:', error);
    throw error;
  }
}
```

## Data Flow

### Detailed Sequence Diagram

```
User → CLI
       │
       ├─→ fetchFreshData()
       │   │
       │   ├─→ fetchTopStories() → HackerNews API
       │   │                        └─→ [30 stories]
       │   │
       │   ├─→ contentFilter.filterStories([30 stories])
       │   │   │
       │   │   ├─→ Check if enabled
       │   │   │   └─→ If disabled: return all stories
       │   │   │
       │   │   ├─→ Build AI prompt with titles
       │   │   │
       │   │   ├─→ translator.sendToDeepSeek(prompt)
       │   │   │   └─→ DeepSeek API
       │   │   │       └─→ Classification response
       │   │   │
       │   │   ├─→ Parse JSON response
       │   │   │
       │   │   └─→ Filter stories (keep only "SAFE")
       │   │       └─→ [25 stories] (5 filtered out)
       │   │
       │   ├─→ translator.translateBatch([25 titles])
       │   │
       │   ├─→ fetchArticlesBatch([25 stories])
       │   │
       │   └─→ Return processed stories
       │
       └─→ Display/Export results
```

## Error Handling Strategy

### Error Scenarios

1. **DeepSeek API Unavailable**
   ```typescript
   try {
     const response = await sendToDeepSeek(prompt);
   } catch (error) {
     console.warn('Content filter API unavailable, allowing all stories');
     return stories; // Fallback: no filtering
   }
   ```

2. **Invalid API Response**
   ```typescript
   try {
     const classifications = parseResponse(response);
   } catch (error) {
     console.warn('Invalid filter response, allowing all stories');
     return stories; // Fallback: no filtering
   }
   ```

3. **Timeout**
   ```typescript
   const response = await sendToDeepSeek(prompt, {
     timeout: CONTENT_FILTER.TIMEOUT
   });
   // Axios will throw on timeout, caught by error handler above
   ```

4. **Partial Results**
   ```typescript
   if (classifications.length !== stories.length) {
     console.warn('Incomplete classification results');
     return stories; // Fallback: no filtering
   }
   ```

### Fallback Philosophy

**Principle**: "Fail open, not closed"
- If filtering fails → Allow all stories through
- Rationale: Better to show unfiltered content than block everything
- User can always retry with `--no-cache --refresh`

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**
   - Send all titles in single API call (not individual calls)
   - Reduces network overhead
   - Leverages DeepSeek's batch processing capability

2. **Early Return**
   ```typescript
   if (!this.enabled) {
     return stories; // Skip filtering entirely
   }
   ```

3. **Parallel Execution**
   - Content filtering and article fetching could be parallelized in future
   - Current design: sequential (filter → translate → fetch)

4. **Caching Strategy**
   - Filtered stories are cached with cache service
   - Cache key includes filter settings (enabled, sensitivity)
   - Changing filter settings invalidates cache

### Performance Metrics

Expected timing for 30 stories:
- **Filter disabled**: 0ms (skipped)
- **Filter enabled**: 2000-5000ms
  - API latency: ~1500-3000ms
  - JSON parsing: ~10ms
  - Array filtering: ~5ms

## Testing Strategy

### Unit Tests

```typescript
describe('AIContentFilter', () => {
  describe('filterStories', () => {
    it('should filter sensitive stories', async () => {
      const filter = new AIContentFilter(mockTranslator);
      const stories = [
        { id: 1, title: 'New JS framework', ... },
        { id: 2, title: 'Sensitive political topic', ... }
      ];
      
      mockTranslator.sendToDeepSeek.mockResolvedValue(
        JSON.stringify([
          { index: 0, classification: 'SAFE' },
          { index: 1, classification: 'SENSITIVE' }
        ])
      );
      
      const result = await filter.filterStories(stories);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
    
    it('should return all stories when disabled', async () => {
      process.env.ENABLE_CONTENT_FILTER = 'false';
      const filter = new AIContentFilter(mockTranslator);
      
      const result = await filter.filterStories(stories);
      
      expect(result).toEqual(stories);
      expect(mockTranslator.sendToDeepSeek).not.toHaveBeenCalled();
    });
    
    it('should fallback to unfiltered on API error', async () => {
      mockTranslator.sendToDeepSeek.mockRejectedValue(
        new Error('API error')
      );
      
      const result = await filter.filterStories(stories);
      
      expect(result).toEqual(stories);
    });
  });
});
```

### Integration Tests

```typescript
describe('Content Filter Integration', () => {
  it('should filter stories before translation', async () => {
    process.env.ENABLE_CONTENT_FILTER = 'true';
    
    const stories = await fetchFreshData(30, 24);
    
    // Verify filtering occurred
    expect(translateBatch).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(String)])
    );
    
    // Verify translation only called for filtered stories
    const translatedCount = translateBatch.mock.calls[0][0].length;
    expect(translatedCount).toBeLessThanOrEqual(30);
  });
});
```

## Implementation Phases

### Phase 1: Core Service (2-3 hours)
- Create `contentFilter.ts`
- Implement `AIContentFilter` class
- Add configuration constants
- Write unit tests

### Phase 2: Integration (1-2 hours)
- Integrate into `fetchFreshData()`
- Add console logging
- Handle story count display

### Phase 3: Testing (1-2 hours)
- Integration tests
- Manual testing with real data
- Performance testing

### Phase 4: Documentation (1 hour)
- Update README.md
- Add configuration examples
- Document sensitivity levels

**Total Estimated Time**: 5-8 hours

## Dependencies

### External Dependencies
- DeepSeek API (existing dependency)
- No new npm packages required

### Internal Dependencies
- `translator` service (for LLM communication)
- `HNStory` type definition
- `CONTENT_FILTER` constants

## Migration Path

### Rollout Strategy

1. **Default Disabled**: Feature is opt-in (`ENABLE_CONTENT_FILTER=false`)
2. **Gradual Adoption**: Users can test with `--export-daily` mode first
3. **Monitoring**: Watch for API errors, performance impact
4. **Iteration**: Adjust prompt and sensitivity based on feedback

### Backward Compatibility

- ✅ No breaking changes to existing APIs
- ✅ All existing workflows work unchanged
- ✅ Cache service automatically handles filtered results
- ✅ Export formats unchanged

## Security Considerations

1. **Prompt Injection**: Story titles are user-generated (from HN)
   - Mitigation: Sanitize titles, clear prompt structure
   
2. **API Key Exposure**: Uses existing DeepSeek API key
   - Mitigation: Already handled by translator service
   
3. **Data Privacy**: Story titles sent to DeepSeek
   - Acceptable: Titles are public data from HackerNews

## Future Enhancements

Potential improvements for future versions:
1. Cache AI classifications (by title hash)
2. Support multiple LLM providers
3. Add content filtering for article text and comments
4. Provide filter analytics/reporting
5. Add manual whitelist/blacklist override
